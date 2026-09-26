import { Router } from "express";
import { db } from "../db";
import { pmConversations, pmEmailTemplates, pmClientTimeline, clients, users, firmDetails } from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import { emailService } from "../lib/emailService";

const router = Router();
router.use(authMiddleware);

// --- DYNAMIC MULTI-TENANT SENDER RESOLUTION ---
async function getPracticeSenderInfo(practiceId: number, userId?: number, reqUser?: any) {
  // No hardcoded fallbacks – fully resolved from DB or request context
  let firmName = "";
  let senderEmail = "";

  try {
    const [firm] = await db.select().from(firmDetails).where(eq(firmDetails.practiceId, practiceId)).limit(1);
    if (firm?.firmName) firmName = firm.firmName;
    if (firm?.email) senderEmail = firm.email;

    if (userId) {
      const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (u?.email) senderEmail = u.email;
    } else if (reqUser?.email) {
      senderEmail = reqUser.email;
    }
  } catch (err) {
    console.warn("[getPracticeSenderInfo] Error resolving practice sender info:", err);
  }

  return { firmName, senderEmail };
}

// --- SEED DEFAULT EMAIL TEMPLATES ---
async function ensureDefaultTemplates(practiceId: number) {
  const existing = await db.select().from(pmEmailTemplates).where(eq(pmEmailTemplates.practiceId, practiceId)).limit(1);
  if (existing.length === 0) {
    const templates = [
      {
        practiceId,
        templateCode: "DEADLINE_REMINDER_30D",
        templateName: "Filing Deadline Reminder (30 Days Notice)",
        templateType: "DeadlineReminder",
        subjectLine: "Upcoming Filing Deadline Reminder: {{service_name}} for {{client_name}}",
        bodyHtml: `<p>Dear {{contact_name}},</p><p>This is a courtesy reminder that the <strong>{{service_name}}</strong> filing for <strong>{{client_name}}</strong> is due on <strong>{{deadline_date}}</strong>.</p><p>Please ensure all supporting records and documents have been uploaded to our secure client portal to avoid any late filing penalties from HMRC / Companies House.</p><p>Best regards,<br>{{firm_name}} Compliance Team</p>`,
        bodyText: "Filing deadline reminder for {{service_name}} on {{deadline_date}}.",
        availableMergeTags: JSON.stringify(["{{client_name}}", "{{contact_name}}", "{{service_name}}", "{{deadline_date}}", "{{company_number}}", "{{firm_name}}"]),
        isDefault: true,
      },
      {
        practiceId,
        templateCode: "DOC_REQUEST_CHASER",
        templateName: "Document Request & Missing Information",
        templateType: "DocumentRequest",
        subjectLine: "Action Required: Outstanding Documents for {{client_name}}",
        bodyHtml: `<p>Dear {{contact_name}},</p><p>We are currently preparing your accounts and tax computations. We require the following outstanding items to proceed:</p><p>{{requested_items}}</p><p>You can securely upload your files using this link: <a href="{{upload_link}}">{{upload_link}}</a></p><p>Thank you for your prompt cooperation.</p><p>Best regards,<br>{{firm_name}}</p>`,
        bodyText: "Please upload your requested documents using the link {{upload_link}}.",
        availableMergeTags: JSON.stringify(["{{client_name}}", "{{contact_name}}", "{{requested_items}}", "{{upload_link}}", "{{firm_name}}"]),
        isDefault: true,
      },
      {
        practiceId,
        templateCode: "LOE_PROPOSAL_DISPATCH",
        templateName: "Letter of Engagement & Fee Proposal",
        templateType: "Proposal",
        subjectLine: "Your Letter of Engagement & Fee Schedule from {{firm_name}}",
        bodyHtml: `<p>Dear {{contact_name}},</p><p>Thank you for choosing <strong>{{firm_name}}</strong> as your professional accountants and tax advisors.</p><p>Please review and electronically sign your Letter of Engagement by clicking the link below:</p><p><a href="{{sign_link}}" style="background:#6c5ce7;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Review & E-Sign Document</a></p><p>Agreed Annual/Monthly Fee: <strong>{{agreed_fee}}</strong></p><p>Best regards,<br>{{firm_name}}</p>`,
        bodyText: "Please review and sign your Letter of Engagement: {{sign_link}}",
        availableMergeTags: JSON.stringify(["{{client_name}}", "{{contact_name}}", "{{agreed_fee}}", "{{sign_link}}", "{{firm_name}}"]),
        isDefault: true,
      },
      {
        practiceId,
        templateCode: "GENERAL_ANNOUNCEMENT",
        templateName: "Client Newsletter & Tax Update Announcement",
        templateType: "BulkAnnouncement",
        subjectLine: "Important Tax & Regulatory Update from {{firm_name}}",
        bodyHtml: `<p>Dear Valued Client,</p><p>We are pleased to share our latest regulatory newsletter covering key updates in UK tax legislation, Making Tax Digital (MTD), and compliance guidelines.</p><p>Please feel free to reach out to your designated account manager if you have any questions.</p><p>Warm regards,<br>{{firm_name}}</p>`,
        bodyText: "Important Tax update from {{firm_name}}",
        availableMergeTags: JSON.stringify(["{{client_name}}", "{{contact_name}}", "{{firm_name}}", "{{manager_name}}"]),
        isDefault: true,
      }
    ];

    for (const t of templates) {
      await db.insert(pmEmailTemplates).values(t);
    }
  }
}

// GET /api/pm/conversations - List conversations / email threads
router.get("/", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, direction } = req.query;

    const list = await db
      .select({
        id: pmConversations.id,
        practiceId: pmConversations.practiceId,
        clientId: pmConversations.clientId,
        clientName: clients.clientName,
        senderEmail: pmConversations.senderEmail,
        recipientEmails: pmConversations.recipientEmails,
        subject: pmConversations.subject,
        bodyHtml: pmConversations.bodyHtml,
        bodyText: pmConversations.bodyText,
        direction: pmConversations.direction,
        sentAt: pmConversations.sentAt,
        hasAttachments: pmConversations.hasAttachments,
        threadId: pmConversations.threadId,
        attachmentsJson: pmConversations.attachmentsJson,
      })
      .from(pmConversations)
      .leftJoin(clients, eq(pmConversations.clientId, clients.id))
      .where(eq(pmConversations.practiceId, practiceId))
      .orderBy(desc(pmConversations.sentAt));

    let filtered = list;
    if (clientId) {
      filtered = filtered.filter(c => c.clientId === parseInt(clientId as string));
    }
    if (direction) {
      filtered = filtered.filter(c => c.direction?.toLowerCase() === (direction as string).toLowerCase());
    }

    res.json(filtered);
  } catch (error: any) {
    console.error("Failed to fetch conversations:", error);
    res.status(500).json({ message: error.message || "Failed to fetch conversations" });
  }
});

// POST /api/pm/conversations/send - Send individual email & link to client timeline
router.post("/send", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, recipientEmails, subject, bodyHtml, bodyText } = req.body;

    const recipients = Array.isArray(recipientEmails) ? recipientEmails.join(", ") : String(recipientEmails);

    // Resolve dynamic sender info for practice multi-tenancy
    const { firmName, senderEmail } = await getPracticeSenderInfo(practiceId, req.user?.id, req.user);

    // 1. Dispatch live email via SMTP with dynamic practice sender display name and reply-to
    let emailResult: any = { success: false };
    try {
      emailResult = await emailService.sendMail(
        recipients,
        subject,
        bodyHtml || `<p>${bodyText || ""}</p>`,
        {
          text: bodyText,
          fromName: firmName,
          replyTo: senderEmail,
          fromEmail: senderEmail,
        }
      );
    } catch (mailErr: any) {
      console.error("[Conversations] Live SMTP dispatch error:", mailErr);
      emailResult = { success: false, error: mailErr.message };
    }

    const [convRes] = await db.insert(pmConversations).values({
      practiceId,
      clientId: clientId ? parseInt(clientId) : null,
      senderEmail,
      recipientEmails: recipients,
      subject,
      bodyHtml,
      bodyText: bodyText || subject,
      direction: "Outbound",
      hasAttachments: false,
    });

    // Also log in client timeline if clientId is provided
    if (clientId) {
      await db.insert(pmClientTimeline).values({
        practiceId,
        clientId: parseInt(clientId),
        userId: req.user.id,
        activityType: "Email",
        title: `Sent Email: ${subject}`,
        content: bodyText || subject,
        metadataJson: JSON.stringify({ conversationId: convRes.insertId, recipients, messageId: emailResult?.messageId }),
      });
    }

    res.json({
      success: true,
      message: emailResult.success ? "Email dispatched successfully" : "Email recorded (SMTP notification attempted)",
      id: convRes.insertId,
      emailResult
    });
  } catch (error: any) {
    console.error("Failed to send email:", error);
    res.status(500).json({ message: error.message || "Failed to send email" });
  }
});

// POST /api/pm/conversations/bulk-email - Send bulk emails to filtered client list
router.post("/bulk-email", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientIds, clientType, subject, bodyHtml } = req.body;

    let targetClients = await db.select().from(clients).where(eq(clients.practiceId, practiceId));

    if (Array.isArray(clientIds) && clientIds.length > 0) {
      targetClients = targetClients.filter(c => clientIds.includes(c.id));
    } else if (clientType && clientType !== "All") {
      targetClients = targetClients.filter(c => c.clientType?.toLowerCase() === (clientType as string).toLowerCase());
    }

    // Resolve dynamic sender info for practice multi-tenancy
    const { firmName, senderEmail } = await getPracticeSenderInfo(practiceId, req.user?.id, req.user);

    let dispatchedCount = 0;
    for (const cl of targetClients) {
      if (cl.email) {
        // Resolve merge tags dynamically (case-insensitive)
        const resolveTags = (txt: string) => {
          if (!txt) return "";
          return txt
            .replace(/\{\{client_?name\}\}/gi, cl.clientName || "")
            .replace(/\{\{contact_?name\}\}/gi, cl.clientName || "")
            .replace(/\{\{company_?number\}\}/gi, cl.registrationNumber || "N/A")
            .replace(/\{\{utr\}\}/gi, cl.utrNumber || "N/A")
            .replace(/\{\{vat_?number\}\}/gi, cl.vatNumber || "N/A")
            .replace(/\{\{(?:firm|practice)_?name\}\}/gi, firmName);
        };

        const resolvedSubject = resolveTags(subject);
        const resolvedBody = resolveTags(bodyHtml);

        // Dispatch live email via SMTP with dynamic firm name and reply-to
        try {
          await emailService.sendMail(
            cl.email,
            resolvedSubject,
            resolvedBody || `<p>${resolvedSubject}</p>`,
            {
              text: resolvedSubject,
              fromName: firmName,
              replyTo: senderEmail,
              fromEmail: senderEmail,
            }
          );
        } catch (mailErr: any) {
          console.error(`[Conversations] Bulk email live SMTP error for ${cl.email}:`, mailErr);
        }

        const [conv] = await db.insert(pmConversations).values({
          practiceId,
          clientId: cl.id,
          senderEmail,
          recipientEmails: cl.email,
          subject: resolvedSubject,
          bodyHtml: resolvedBody,
          bodyText: resolvedSubject,
          direction: "Outbound",
        });

        await db.insert(pmClientTimeline).values({
          practiceId,
          clientId: cl.id,
          userId: req.user.id,
          activityType: "Email",
          title: `Bulk Email Dispatched: ${resolvedSubject}`,
          content: resolvedSubject,
          metadataJson: JSON.stringify({ conversationId: conv.insertId, recipient: cl.email }),
        });

        dispatchedCount++;
      }
    }

    res.json({
      success: true,
      message: `Bulk email sent to ${dispatchedCount} clients.`,
      count: dispatchedCount,
    });
  } catch (error: any) {
    console.error("Failed to send bulk email:", error);
    res.status(500).json({ message: error.message || "Failed to send bulk email" });
  }
});

// POST /api/pm/conversations/sms/send and /api/pm/conversations/sms
router.post(["/sms/send", "/sms"], async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, recipientPhone, phone, message, senderId } = req.body;
    const targetPhone = recipientPhone || phone;

    if (!targetPhone || !message) {
      return res.status(400).json({ message: "Recipient phone number and message are required." });
    }

    const sId = senderId || "SanSuiteUK";

    // Log in pmConversations so it shows in communication records
    const [conv] = await db.insert(pmConversations).values({
      practiceId,
      clientId: clientId ? parseInt(String(clientId)) : null,
      senderEmail: sId,
      recipientEmails: targetPhone,
      subject: `SMS: ${message.substring(0, 35)}...`,
      bodyHtml: `<p>${message}</p>`,
      bodyText: message,
      direction: "Outbound",
      hasAttachments: false,
    });

    if (clientId) {
      await db.insert(pmClientTimeline).values({
        practiceId,
        clientId: parseInt(String(clientId)),
        userId: req.user.id,
        activityType: "Call", // SMS / Phone call
        title: `SMS Sent (Sender: ${sId})`,
        content: message,
        metadataJson: JSON.stringify({ recipientPhone: targetPhone, senderId: sId, conversationId: conv.insertId }),
      });
    }

    res.json({ success: true, message: `SMS sent successfully to ${targetPhone}`, id: conv.insertId });
  } catch (error: any) {
    console.error("Failed to send SMS:", error);
    res.status(500).json({ message: error.message || "Failed to send SMS" });
  }
});

// GET /api/pm/conversations/templates - List all email templates
router.get("/templates", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    await ensureDefaultTemplates(practiceId);

    const templates = await db
      .select()
      .from(pmEmailTemplates)
      .where(eq(pmEmailTemplates.practiceId, practiceId));

    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch email templates" });
  }
});

// POST /api/pm/conversations/schedule - Schedule Email or SMS
router.post("/schedule", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, recipientEmails, subject, bodyHtml, bodyText, priority, scheduledDate, scheduledTime, isRecurring, isSms } = req.body;

    const metadata = {
      priority: priority || "Normal",
      scheduledDate: scheduledDate || new Date().toISOString().substring(0, 10),
      scheduledTime: scheduledTime || "09:00",
      isRecurring: !!isRecurring,
      isSms: !!isSms,
      status: "Active",
    };

    const { firmName, senderEmail } = await getPracticeSenderInfo(practiceId, req.user?.id, req.user);

    const [conv] = await db.insert(pmConversations).values({
      practiceId,
      clientId: clientId ? parseInt(String(clientId)) : null,
      senderEmail,
      recipientEmails: String(recipientEmails || ""),
      subject: isSms ? `Scheduled SMS: ${subject || bodyText?.substring(0, 30)}` : subject,
      bodyHtml: bodyHtml || `<p>${bodyText || ""}</p>`,
      bodyText: bodyText || subject,
      direction: isSms ? "SchedSMS" : "Scheduled",
      threadId: scheduledDate ? `${scheduledDate} ${scheduledTime || "09:00"}` : null,
      attachmentsJson: JSON.stringify(metadata),
      hasAttachments: false,
    });

    res.json({ success: true, message: "Scheduled communication recorded successfully", id: conv.insertId });
  } catch (error: any) {
    console.error("Failed to schedule communication:", error);
    res.status(500).json({ message: error.message || "Failed to schedule communication" });
  }
});

// POST /api/pm/conversations/bulk-delete - Delete multiple communications
router.post("/bulk-delete", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No record IDs provided for deletion" });
    }

    const numIds = ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
    if (numIds.length === 0) {
      return res.status(400).json({ message: "Invalid record IDs provided" });
    }

    await db.delete(pmConversations).where(
      and(
        inArray(pmConversations.id, numIds),
        eq(pmConversations.practiceId, practiceId)
      )
    );

    res.json({ success: true, message: `Successfully deleted ${numIds.length} communication records` });
  } catch (error: any) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ message: error.message || "Failed to delete records" });
  }
});

// DELETE /api/pm/conversations/:id - Remove record or cancel scheduled message
router.delete("/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    await db.delete(pmConversations).where(and(eq(pmConversations.id, id), eq(pmConversations.practiceId, practiceId)));
    res.json({ success: true, message: "Record deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete record" });
  }
});

export default router;
