/**
 * Compliance Background Scheduler with Redis Distributed Lock
 *
 * When running multiple server instances, only ONE should run the scheduler.
 * This is achieved via a Redis distributed lock (leader election):
 *   - Each server tries to acquire a Redis key with SET NX EX (atomic).
 *   - Only the server that wins the lock runs the check.
 *   - The lock expires automatically, so if the leader crashes, another
 *     server will win the next election and take over.
 *
 * Without Redis (single-server fallback):
 *   - The Redis shim's NX always succeeds, so the server always runs the
 *     scheduler (correct behavior for single-server deployments).
 */

import { db } from "../db";
import { pmDeadlines, pmConversations, pmClientTimeline, clients, users, firmDetails } from "@shared/schema";
import { eq, and, sql, lte } from "drizzle-orm";
import { redis } from "./redis";
import { randomBytes } from "crypto";
import { emailService } from "./emailService";

// Unique ID for this server instance (used for lock ownership)
const SERVER_ID = randomBytes(8).toString("hex");

// Lock key in Redis
const SCHEDULER_LOCK_KEY = "sansuite:scheduler:leader";

// Lock TTL — how long the leader holds the lock before it expires
// Should be slightly longer than the check interval
const LOCK_TTL_SEC = 13 * 60 * 60; // 13 hours (a bit more than 12h interval)

async function acquireSchedulerLock(): Promise<boolean> {
  try {
    // SET key value NX EX ttl — only sets if key does NOT exist (atomic)
    const result = await redis.set(SCHEDULER_LOCK_KEY, SERVER_ID, "NX", LOCK_TTL_SEC as any);
    return result === "OK";
  } catch {
    // If Redis is unavailable, default to running (single-server safe)
    return true;
  }
}

/**
 * Compliance Background Scheduler
 * 1. Checks upcoming deadlines and transitions statuses:
 *    - Upcoming -> Due (within 30 days)
 *    - Due -> Overdue (past statutory deadline)
 * 2. Automated reminder dispatch simulation.
 */
export function startComplianceScheduler() {
  console.log("[ComplianceScheduler] Starting statutory compliance daemon...");

  async function tick() {
    const isLeader = await acquireSchedulerLock();
    if (!isLeader) {
      console.log(`[ComplianceScheduler] Server ${SERVER_ID}: not the leader, skipping this run.`);
      return;
    }
    console.log(`[ComplianceScheduler] Server ${SERVER_ID}: acquired leader lock, running check.`);
    await runDeadlineStatusCheck().catch((err) =>
      console.error("[ComplianceScheduler] Error:", err.message)
    );
  }

  // Run initial check on startup
  tick();

  // Run every 12 hours
  const INTERVAL_MS = 12 * 60 * 60 * 1000;
  setInterval(tick, INTERVAL_MS);
}

async function runDeadlineStatusCheck() {
  const now = new Date();
  const allDeadlines = await db.select().from(pmDeadlines);

  let updatedCount = 0;
  let reminderCount = 0;

  for (const d of allDeadlines) {
    if (d.status === "Submitted" || d.status === "Completed" || d.status === "Waived") continue;

    const statDate = new Date(d.statutoryDeadlineDate);
    const diffDays = Math.ceil((statDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let newStatus = d.status;
    if (diffDays < 0) {
      newStatus = "Overdue";
    } else if (diffDays <= 30) {
      newStatus = "Due";
    } else {
      newStatus = "Upcoming";
    }

    if (newStatus !== d.status) {
      await db
        .update(pmDeadlines)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(pmDeadlines.id, d.id));
      updatedCount++;
    }

    // Automated Email Dispatch on key milestone intervals: 30, 14, 7, 3, 1 days
    if ([30, 14, 7, 3, 1].includes(diffDays) && d.clientId) {
      try {
        const [client] = await db.select().from(clients).where(eq(clients.id, d.clientId)).limit(1);
        if (client) {
          const recipientEmail =
            client.email ||
            `${(client.clientName || "client").toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`;
          const clientName = client.clientName || "Valued Client";
          const formattedDate = statDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const subject = `Urgent Reminder: ${d.deadlineName} due in ${diffDays} day(s) (${formattedDate})`;

          const bodyHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
              <h3 style="color: #5c469c; margin-top: 0;">Statutory Compliance Deadline Reminder</h3>
              <p>Dear ${clientName},</p>
              <p>This is a statutory notification that your filing obligation for <strong>${d.deadlineName}</strong> is due on <strong>${formattedDate}</strong> (${diffDays} days remaining).</p>
              <p>Please ensure all supporting accounting information is sent to your accountant.</p>
              <p style="color: #64748b; font-size: 11px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">Sent automatically by SanSuite Practice Management.</p>
            </div>
          `;

          // Resolve dynamic multi-tenant practice sender info (fully from DB, no hardcoded fallbacks)
          let firmName = "";
          let senderEmail = "";
          try {
            const [firm] = await db.select().from(firmDetails).where(eq(firmDetails.practiceId, d.practiceId)).limit(1);
            if (firm?.firmName) firmName = firm.firmName;
            if (firm?.email) senderEmail = firm.email;
          } catch (err) {
            console.warn("[ComplianceScheduler] Error resolving firm details:", err);
          }

          // Dispatch live statutory reminder email via SMTP
          try {
            await emailService.sendMail(
              recipientEmail,
              subject,
              bodyHtml,
              {
                text: subject,
                fromName: firmName,
                replyTo: senderEmail,
                fromEmail: senderEmail,
              }
            );
          } catch (mailErr) {
            console.error("[ComplianceScheduler] Automated live reminder SMTP error:", mailErr);
          }

          await db.insert(pmConversations).values({
            practiceId: d.practiceId,
            clientId: d.clientId,
            senderEmail,
            recipientEmails: recipientEmail,
            subject,
            bodyHtml,
            bodyText: subject,
            direction: "Outbound",
            hasAttachments: false,
          });

          await db.insert(pmClientTimeline).values({
            practiceId: d.practiceId,
            clientId: d.clientId,
            userId: d.assignedUserId || null,
            activityType: "Email",
            title: `Automated ${diffDays}-Day Deadline Reminder: ${d.deadlineName}`,
            content: `Notice dispatched to ${recipientEmail} for statutory deadline on ${formattedDate}.`,
          });

          reminderCount++;
        }
      } catch (mailErr) {
        console.error("[ComplianceScheduler] Automated reminder error:", mailErr);
      }
    }
  }

  if (updatedCount > 0 || reminderCount > 0) {
    console.log(
      `[ComplianceScheduler] Checked deadlines. Updated: ${updatedCount}, Reminders Dispatched: ${reminderCount}`
    );
  }
}
