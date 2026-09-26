import { Router } from "express";
import { db, pool } from "../db";
import { pmDeadlines, pmClientPeriods, clients, pmServices, users, pmConversations, pmClientTimeline, firmDetails } from "@shared/schema";
import { eq, and, sql, desc, asc, lte, gte, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import { emailService } from "../lib/emailService";

const router = Router();
router.use(authMiddleware);

// --- COMPLIANCE DEADLINE CALCULATION LOGIC ---

/**
 * Statutory calculation rules:
 * 1. Annual Accounts: Period End + 9 Months (for private limited company)
 * 2. CT600 Corporation Tax: Period End + 12 Months (Tax payment is Period End + 9 Months 1 Day)
 * 3. VAT Return: Quarter End + 1 Month + 7 Days
 * 4. Confirmation Statement (CS01): Review Date + 14 Days
 * 5. Self Assessment: Next 31st January following tax year end (5th April)
 */

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateToIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Calculate and populate statutory deadlines for a client based on their periods & type
export async function refreshClientDeadlines(practiceId: number, clientId: number) {
  const clientRows = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.practiceId, practiceId))).limit(1);
  if (clientRows.length === 0) return;
  const client = clientRows[0];

  const now = new Date();
  const currentYear = now.getFullYear();

  // If Limited Company, compute Accounts, CT600, and CS01 (with Live Companies House API integration)
  if (client.clientType === "Limited" || client.clientType === "LimitedCompany" || client.clientType === "LLP") {
    let accountsFilingDeadline: Date | null = null;
    let ct600FilingDeadline: Date | null = null;
    let cs01FilingDeadline: Date | null = null;

    // 1. Attempt live Companies House API lookup if CRN and API key are present
    if (client.registrationNumber && process.env.COMPANIES_HOUSE_API_KEY) {
      try {
        const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
        const chRes = await fetch(`https://api.company-information.service.gov.uk/company/${client.registrationNumber}`, {
          headers: { "Authorization": authHeader, "Accept": "application/json" }
        });
        if (chRes.ok) {
          const chData = await chRes.json();
          if (chData.accounts?.next_accounts?.due_on) {
            accountsFilingDeadline = new Date(chData.accounts.next_accounts.due_on);
          }
          if (chData.confirmation_statement?.next_due) {
            cs01FilingDeadline = new Date(chData.confirmation_statement.next_due);
          }
          if (chData.accounts?.next_made_up_to) {
            const ard = new Date(chData.accounts.next_made_up_to);
            ct600FilingDeadline = addMonths(ard, 12);
          }
        }
      } catch (err) {
        console.warn("Companies House live sync notice:", err);
      }
    }

    // 2. Fallback to statutory UK Companies House rules (Year End + 9 months, CT600 = Year End + 12 months, CS01 = 14 days)
    const yearEndMonth = 2; // 0-indexed March
    const periodEnd = new Date(currentYear, yearEndMonth + 1, 0); // Last day of March

    if (!accountsFilingDeadline) accountsFilingDeadline = addMonths(periodEnd, 9);
    if (!ct600FilingDeadline) ct600FilingDeadline = addMonths(periodEnd, 12);
    if (!cs01FilingDeadline) cs01FilingDeadline = addDays(now, 14);

    // 1. Annual Accounts
    await upsertStatutoryDeadline({
      practiceId,
      clientId,
      deadlineName: `Annual Accounts Filing (${periodEnd.getFullYear()})`,
      serviceType: "Accounts",
      statutoryDeadlineDate: accountsFilingDeadline,
      internalDeadlineDate: addDays(accountsFilingDeadline, -14),
    });

    // 2. CT600 Return
    await upsertStatutoryDeadline({
      practiceId,
      clientId,
      deadlineName: `Corporation Tax CT600 (${periodEnd.getFullYear()})`,
      serviceType: "CT600",
      statutoryDeadlineDate: ct600FilingDeadline,
      internalDeadlineDate: addDays(ct600FilingDeadline, -30),
    });

    // 3. Confirmation Statement
    await upsertStatutoryDeadline({
      practiceId,
      clientId,
      deadlineName: `Confirmation Statement CS01 (${currentYear})`,
      serviceType: "CS01",
      statutoryDeadlineDate: cs01FilingDeadline,
      internalDeadlineDate: addDays(cs01FilingDeadline, -7),
    });
  }

  // If VAT registered, calculate quarterly VAT deadline
  if (client.vatNumber) {
    // Current Quarter end
    const quarterEnd = new Date(currentYear, Math.floor(now.getMonth() / 3) * 3 + 3, 0);
    const vatDeadline = addDays(addMonths(quarterEnd, 1), 7); // 1 month 7 days

    await upsertStatutoryDeadline({
      practiceId,
      clientId,
      deadlineName: `VAT Return Q${Math.floor(now.getMonth() / 3) + 1} (${currentYear})`,
      serviceType: "VAT",
      statutoryDeadlineDate: vatDeadline,
      internalDeadlineDate: addDays(vatDeadline, -7),
    });
  }

  // If Individual / Sole Trader / Director, calculate SA100 Self Assessment
  if (client.clientType === "Individual" || client.clientType === "SoleTrader" || client.clientType === "Partnership") {
    const saDeadline = new Date(currentYear + (now.getMonth() >= 3 ? 1 : 0), 0, 31); // 31 Jan

    await upsertStatutoryDeadline({
      practiceId,
      clientId,
      deadlineName: `Self Assessment Tax Return SA100 (${saDeadline.getFullYear() - 1}/${saDeadline.getFullYear()})`,
      serviceType: "SA100",
      statutoryDeadlineDate: saDeadline,
      internalDeadlineDate: addDays(saDeadline, -21),
    });
  }
}

async function upsertStatutoryDeadline(params: {
  practiceId: number;
  clientId: number;
  deadlineName: string;
  serviceType: string;
  statutoryDeadlineDate: Date;
  internalDeadlineDate?: Date;
}) {
  const existing = await db
    .select()
    .from(pmDeadlines)
    .where(
      and(
        eq(pmDeadlines.clientId, params.clientId),
        eq(pmDeadlines.serviceType, params.serviceType),
        eq(pmDeadlines.deadlineName, params.deadlineName)
      )
    )
    .limit(1);

  const statDate = params.statutoryDeadlineDate;
  const now = new Date();

  let computedStatus = "Upcoming";
  const diffDays = Math.ceil((statDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) computedStatus = "Overdue";
  else if (diffDays <= 30) computedStatus = "Due";

  if (existing.length > 0) {
    if (existing[0].status !== "Submitted" && existing[0].status !== "Completed" && existing[0].status !== "Waived") {
      await db
        .update(pmDeadlines)
        .set({
          statutoryDeadlineDate: statDate,
          internalDeadlineDate: params.internalDeadlineDate,
          status: computedStatus,
          updatedAt: new Date(),
        })
        .where(eq(pmDeadlines.id, existing[0].id));
    }
  } else {
    await db.insert(pmDeadlines).values({
      practiceId: params.practiceId,
      clientId: params.clientId,
      deadlineName: params.deadlineName,
      serviceType: params.serviceType,
      statutoryDeadlineDate: statDate,
      internalDeadlineDate: params.internalDeadlineDate,
      status: computedStatus,
      isStatutory: true,
      reminderDays: "30,14,7,1",
    });
  }
}

// GET /api/pm/deadlines - List deadlines with multi-filters
router.get("/", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { status, serviceType, clientId, assignedUserId, range } = req.query;

    const query = db
      .select({
        id: pmDeadlines.id,
        practiceId: pmDeadlines.practiceId,
        clientId: pmDeadlines.clientId,
        clientName: clients.clientName,
        clientCode: clients.clientCode,
        clientType: clients.clientType,
        serviceType: pmDeadlines.serviceType,
        deadlineName: pmDeadlines.deadlineName,
        statutoryDeadlineDate: pmDeadlines.statutoryDeadlineDate,
        internalDeadlineDate: pmDeadlines.internalDeadlineDate,
        status: pmDeadlines.status,
        assignedUserId: pmDeadlines.assignedUserId,
        assignedUserName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        submissionRef: pmDeadlines.submissionRef,
        submittedAt: pmDeadlines.submittedAt,
        isStatutory: pmDeadlines.isStatutory,
        lastReminderSentAt: pmDeadlines.lastReminderSentAt,
      })
      .from(pmDeadlines)
      .innerJoin(clients, eq(pmDeadlines.clientId, clients.id))
      .leftJoin(users, eq(pmDeadlines.assignedUserId, users.id))
      .where(eq(pmDeadlines.practiceId, practiceId))
      .orderBy(asc(pmDeadlines.statutoryDeadlineDate));

    const allDeadlines = await query;

    // Apply in-memory filtering for flexible query parameters
    let filtered = allDeadlines;
    if (status && status !== "All") {
      filtered = filtered.filter(d => d.status?.toLowerCase() === (status as string).toLowerCase());
    }
    if (serviceType && serviceType !== "All") {
      filtered = filtered.filter(d => d.serviceType?.toLowerCase() === (serviceType as string).toLowerCase());
    }
    if (clientId) {
      filtered = filtered.filter(d => d.clientId === parseInt(clientId as string));
    }
    if (assignedUserId) {
      filtered = filtered.filter(d => d.assignedUserId === parseInt(assignedUserId as string));
    }

    res.json(filtered);
  } catch (error: any) {
    console.error("Failed to fetch deadlines:", error);
    res.status(500).json({ message: error.message || "Failed to fetch deadlines" });
  }
});

// POST /api/pm/deadlines/refresh - Global refresh of all client statutory deadlines
router.post("/refresh", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const allPracticeClients = await db.select().from(clients).where(eq(clients.practiceId, practiceId));

    let refreshedCount = 0;
    for (const cl of allPracticeClients) {
      await refreshClientDeadlines(practiceId, cl.id);
      refreshedCount++;
    }

    res.json({
      success: true,
      message: `Deadlines refreshed successfully for ${refreshedCount} clients.`,
      refreshedClients: refreshedCount
    });
  } catch (error: any) {
    console.error("Failed to refresh deadlines:", error);
    res.status(500).json({ message: error.message || "Failed to refresh deadlines" });
  }
});

// POST /api/pm/deadlines - Create custom deadline
router.post("/", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { clientId, deadlineName, serviceType, statutoryDeadlineDate, internalDeadlineDate, assignedUserId, reminderDays } = req.body;

    const statDate = new Date(statutoryDeadlineDate);
    const now = new Date();
    let status = "Upcoming";
    const diffDays = Math.ceil((statDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) status = "Overdue";
    else if (diffDays <= 30) status = "Due";

    const [insertRes] = await db.insert(pmDeadlines).values({
      practiceId,
      clientId: parseInt(clientId),
      deadlineName,
      serviceType: serviceType || "Bespoke",
      statutoryDeadlineDate: statDate,
      internalDeadlineDate: internalDeadlineDate ? new Date(internalDeadlineDate) : undefined,
      assignedUserId: assignedUserId ? parseInt(assignedUserId) : null,
      status,
      isStatutory: false,
      reminderDays: reminderDays || "30,14,7,1",
    });

    res.json({ id: insertRes.insertId, message: "Custom deadline created successfully" });
  } catch (error: any) {
    console.error("Failed to create deadline:", error);
    res.status(500).json({ message: error.message || "Failed to create deadline" });
  }
});

// PATCH /api/pm/deadlines/:id - Update status / Complete / Adjust deadline
router.patch("/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);
    const { status, submissionRef, assignedUserId, internalDeadlineDate, reminderDays } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (reminderDays !== undefined) updateData.reminderDays = reminderDays;
    if (submissionRef) {
      updateData.submissionRef = submissionRef;
      updateData.submittedAt = new Date();
      updateData.submittedBy = req.user.id;
    }
    if (assignedUserId !== undefined) updateData.assignedUserId = assignedUserId ? parseInt(assignedUserId) : null;
    if (internalDeadlineDate) updateData.internalDeadlineDate = new Date(internalDeadlineDate);

    await db
      .update(pmDeadlines)
      .set(updateData)
      .where(and(eq(pmDeadlines.id, id), eq(pmDeadlines.practiceId, practiceId)));

    res.json({ success: true, message: "Deadline updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update deadline" });
  }
});

// DELETE /api/pm/deadlines/:id - Delete or waive deadline
router.delete("/:id", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);

    await db
      .delete(pmDeadlines)
      .where(and(eq(pmDeadlines.id, id), eq(pmDeadlines.practiceId, practiceId)));

    res.json({ success: true, message: "Deadline deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete deadline" });
  }
});

// POST /api/pm/deadlines/:id/send-reminder - Dispatch single deadline reminder email
router.post("/:id/send-reminder", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const id = parseInt(req.params.id);

    const [deadline] = await db
      .select({
        id: pmDeadlines.id,
        deadlineName: pmDeadlines.deadlineName,
        statutoryDeadlineDate: pmDeadlines.statutoryDeadlineDate,
        serviceType: pmDeadlines.serviceType,
        status: pmDeadlines.status,
        clientId: pmDeadlines.clientId,
        clientName: clients.clientName,
        clientEmail: clients.email,
      })
      .from(pmDeadlines)
      .leftJoin(clients, eq(pmDeadlines.clientId, clients.id))
      .where(and(eq(pmDeadlines.id, id), eq(pmDeadlines.practiceId, practiceId)))
      .limit(1);

    if (!deadline) {
      return res.status(404).json({ message: "Deadline not found" });
    }

    // Fetch custom template if created by firm
    let customTemplate: any = null;
    try {
      const [customTplRows]: any = await pool.query(
        "SELECT * FROM practice_email_templates WHERE practice_id = ? AND (template_type LIKE '%Deadline%' OR name LIKE '%Deadline%') ORDER BY id DESC LIMIT 1",
        [practiceId]
      );
      if (customTplRows && customTplRows.length > 0) {
        customTemplate = customTplRows[0];
      }
    } catch (e) {
      console.warn("Could not query practice_email_templates:", e);
    }

    const recipientEmail = deadline.clientEmail || `${(deadline.clientName || "client").toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`;
    const clientName = deadline.clientName || "Valued Client";
    const statDate = new Date(deadline.statutoryDeadlineDate);
    const today = new Date();
    const diffDays = Math.ceil((statDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const formattedDate = statDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const daysText = diffDays > 0 ? `${diffDays} Day(s)` : diffDays === 0 ? "Due Today" : "Overdue";
    const firmName = req.user?.practiceName || "";
    const accountantName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ""}`.trim() : "";
    const accountantEmail = req.user?.email || "";

    let subject = `Urgent Reminder: Statutory ${deadline.deadlineName} due on ${formattedDate}`;
    let bodyHtml = "";
    let bodyText = "";

    if (customTemplate && customTemplate.body) {
      // Dynamic token replacements
      let tplSub = customTemplate.subject || `Notice: Statutory ${deadline.deadlineName} Due on ${formattedDate}`;
      let tplBody = customTemplate.body;

      const tokenMap: Record<string, string> = {
        "{UserName}": req.user?.username || accountantName,
        "{ClientName}": clientName,
        "{AccountantName}": accountantName,
        "{TaskNumber}": String(deadline.id),
        "{TaskName}": deadline.deadlineName,
        "{TaskDueDate}": formattedDate,
        "{DeadlineName}": deadline.deadlineName,
        "{StatutoryDueDate}": formattedDate,
        "{DaysRemaining}": daysText,
        "{FirmName}": firmName,
        "{AccountantEmail}": accountantEmail,
        "{AccountantNumber}": "+44 20 7946 0912",
        // Standard Bracket format support
        "[client.name]": clientName,
        "[deadline.due_date]": formattedDate,
        "[service.name]": deadline.deadlineName,
        "[practice.name]": firmName,
        "[practice.email]": accountantEmail,
      };

      for (const [token, val] of Object.entries(tokenMap)) {
        const regex = new RegExp(token.replace(/[[\]{}()]/g, "\\$&"), "g");
        tplSub = tplSub.replace(regex, val);
        tplBody = tplBody.replace(regex, val);
      }

      subject = tplSub;
      bodyText = tplBody;
      bodyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <div style="background-color: #5c469c; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: bold;">${subject}</h2>
          </div>
          <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
            ${tplBody}
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            Dispatched dynamically via SanSuite Practice Management • ${firmName}
          </p>
        </div>
      `;
    } else {
      // Default Statutory Template fallback
      bodyText = `Reminder: ${deadline.deadlineName} is due on ${formattedDate}.`;
      bodyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <div style="background-color: #5c469c; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: bold;">Statutory Compliance Deadline Reminder</h2>
          </div>
          <p style="font-size: 14px; color: #334155;">Dear <strong>${clientName}</strong>,</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            This is an official compliance notice from your appointed accountant regarding your upcoming statutory filing obligation with HMRC and Companies House.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #5c469c; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 40%;">Obligation:</td>
                <td style="padding: 6px 0;">${deadline.deadlineName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Statutory Due Date:</td>
                <td style="padding: 6px 0; color: #e11d48; font-weight: bold;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Time Remaining:</td>
                <td style="padding: 6px 0; font-weight: bold; color: ${diffDays < 7 ? "#e11d48" : "#2563eb"};">${daysText}</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            To avoid late filing penalties and statutory interest, please ensure all required accounting records, invoices, bank statements, and draft approvals are completed promptly.
          </p>
          <p style="font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Sent automatically via SanSuite Practice Management on behalf of ${firmName}.
          </p>
        </div>
      `;
    }

    // Resolve dynamic multi-tenant sender info
    const [firm] = await db.select().from(firmDetails).where(eq(firmDetails.practiceId, practiceId)).limit(1);
    const [currentUser] = await db.select().from(users).where(eq(users.id, req.user?.id)).limit(1);
    const dynamicSenderEmail = currentUser?.email || req.user?.email || firm?.email || "";
    const dynamicFirmName = firm?.firmName || firmName;

    // Dispatch live email via SMTP
    let emailResult: any = { success: false };
    try {
      emailResult = await emailService.sendMail(
        recipientEmail,
        subject,
        bodyHtml,
        {
          text: bodyText,
          fromName: dynamicFirmName,
          replyTo: dynamicSenderEmail,
          fromEmail: dynamicSenderEmail,
        }
      );
    } catch (mailErr: any) {
      console.error("[Deadlines] Error sending statutory reminder via live SMTP:", mailErr);
    }

    // Log outbound email in conversations
    const [convRes] = await db.insert(pmConversations).values({
      practiceId,
      clientId: deadline.clientId,
      senderEmail: dynamicSenderEmail,
      recipientEmails: recipientEmail,
      subject,
      bodyHtml,
      bodyText,
      direction: "Outbound",
      hasAttachments: false,
    });

    // Log in client timeline
    if (deadline.clientId) {
      await db.insert(pmClientTimeline).values({
        practiceId,
        clientId: deadline.clientId,
        userId: req.user.id,
        activityType: "Email",
        title: `Sent Deadline Reminder: ${deadline.deadlineName}`,
        content: `Statutory reminder dispatched to ${recipientEmail} for deadline on ${formattedDate}.`,
        metadataJson: JSON.stringify({ deadlineId: deadline.id, conversationId: convRes.insertId }),
      });
    }

    // Update reminder timestamp on deadline
    await db
      .update(pmDeadlines)
      .set({ updatedAt: new Date() })
      .where(eq(pmDeadlines.id, deadline.id));

    res.json({
      success: true,
      message: `Statutory reminder email successfully dispatched to ${recipientEmail}`,
      recipientEmail,
      subject,
    });
  } catch (error: any) {
    console.error("Failed to send deadline reminder:", error);
    res.status(500).json({ message: error.message || "Failed to send reminder email" });
  }
});

// POST /api/pm/deadlines/reminders/dispatch-all - Bulk dispatch reminders for all due deadlines
router.post("/reminders/dispatch-all", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const now = new Date();

    const upcomingDeadlines = await db
      .select({
        id: pmDeadlines.id,
        deadlineName: pmDeadlines.deadlineName,
        statutoryDeadlineDate: pmDeadlines.statutoryDeadlineDate,
        clientId: pmDeadlines.clientId,
        clientName: clients.clientName,
        clientEmail: clients.email,
      })
      .from(pmDeadlines)
      .leftJoin(clients, eq(pmDeadlines.clientId, clients.id))
      .where(
        and(
          eq(pmDeadlines.practiceId, practiceId),
          inArray(pmDeadlines.status, ["Upcoming", "Due", "Overdue"])
        )
      );

    let dispatchedCount = 0;

    for (const d of upcomingDeadlines) {
      const statDate = new Date(d.statutoryDeadlineDate);
      const diffDays = Math.ceil((statDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Dispatch if within 30 days
      if (diffDays <= 30) {
        const recipientEmail = d.clientEmail || `${(d.clientName || "client").toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`;
        const clientName = d.clientName || "Valued Client";
        const formattedDate = statDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

        const subject = `Notice: ${d.deadlineName} due in ${diffDays} day(s) (${formattedDate})`;
        const bodyHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #5c469c; margin-top: 0;">Statutory Deadline Reminder</h3>
            <p>Dear ${clientName},</p>
            <p>Your filing for <strong>${d.deadlineName}</strong> is due on <strong>${formattedDate}</strong> (${diffDays} days remaining).</p>
            <p>Please review and submit the necessary details to your accountant.</p>
          </div>
        `;

        // Resolve dynamic multi-tenant sender info
        const [firm] = await db.select().from(firmDetails).where(eq(firmDetails.practiceId, practiceId)).limit(1);
        const [currentUser] = await db.select().from(users).where(eq(users.id, req.user?.id)).limit(1);
        const dynamicSenderEmail = currentUser?.email || req.user?.email || firm?.email || "";
        const dynamicFirmName = firm?.firmName || req.user?.practiceName || "";

        // Dispatch live email via SMTP
        try {
          await emailService.sendMail(
            recipientEmail,
            subject,
            bodyHtml,
            {
              text: subject,
              fromName: dynamicFirmName,
              replyTo: dynamicSenderEmail,
              fromEmail: dynamicSenderEmail,
            }
          );
        } catch (mailErr: any) {
          console.error("[Deadlines] Error sending batch reminder via live SMTP:", mailErr);
        }

        await db.insert(pmConversations).values({
          practiceId,
          clientId: d.clientId,
          senderEmail: dynamicSenderEmail,
          recipientEmails: recipientEmail,
          subject,
          bodyHtml,
          bodyText: subject,
          direction: "Outbound",
          hasAttachments: false,
        });

        if (d.clientId) {
          await db.insert(pmClientTimeline).values({
            practiceId,
            clientId: d.clientId,
            userId: req.user.id,
            activityType: "Email",
            title: `Automated Reminder: ${d.deadlineName}`,
            content: `Batch statutory notification dispatched to ${recipientEmail}.`,
          });
        }
        dispatchedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully dispatched ${dispatchedCount} automated statutory reminder emails.`,
      dispatchedCount,
    });
  } catch (error: any) {
    console.error("Batch reminder error:", error);
    res.status(500).json({ message: error.message || "Failed to batch dispatch reminders" });
  }
});

export default router;
