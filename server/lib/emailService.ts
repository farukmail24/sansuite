import nodemailer from "nodemailer";
import { db } from "../db";
import { systemSettings } from "@shared/schema";
import { like } from "drizzle-orm";
import { getAppBaseUrl } from "./appConfig";

interface SignatureInvitationParams {
  to: string;
  signerName: string;
  documentTitle: string;
  signingUrl: string;
  firmName?: string;
  message?: string;
  expiresAt?: Date | string;
  customSubject?: string;
  customBody?: string;
  attachments?: Array<{ fileName: string; fileSize?: number }>;
  baseUrl?: string;
}

interface SignatureReminderParams {
  to: string;
  signerName: string;
  documentTitle: string;
  signingUrl: string;
  firmName?: string;
  baseUrl?: string;
}

interface SignatureCompletionParams {
  to: string;
  signerName: string;
  documentTitle: string;
  completedAt: Date | string;
  ipAddress?: string;
}

class EmailService {
  private defaultFrom = "SanSuite Sign <notifications@sansuite.co.uk>";

  /**
   * Dynamically resolves transporter from MySQL system_settings (configured via System Admin)
   * or falls back to process.env variables.
   */
  async getTransporter(): Promise<{ transporter: nodemailer.Transporter | null; fromAddress: string }> {
    try {
      const rows = await db
        .select()
        .from(systemSettings)
        .where(like(systemSettings.key, "mail_%"));

      const cfg: Record<string, string> = {};
      rows.forEach((r) => {
        if (r.key && r.value) cfg[r.key] = r.value;
      });

      if (cfg.mail_host && cfg.mail_user && cfg.mail_pass) {
        const port = parseInt(cfg.mail_port || "465");
        const isSecure = port === 465 || cfg.mail_encryption === "ssl" || cfg.mail_encryption === "tls";
        const fromAddress = cfg.mail_from || process.env.SMTP_FROM || (cfg.mail_user ? `SanSuite <${cfg.mail_user}>` : this.defaultFrom);

        const transporter = nodemailer.createTransport({
          host: cfg.mail_host,
          port,
          secure: isSecure,
          auth: {
            user: cfg.mail_user,
            pass: cfg.mail_pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        return { transporter, fromAddress };
      }
    } catch (err) {
      console.warn("[EmailService] Error checking system_settings for SMTP:", err);
    }

    // Fallback to process.env
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || (user ? `SanSuite <${user}>` : this.defaultFrom);

    if (host && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
      return { transporter, fromAddress: from };
    }

    return { transporter: null, fromAddress: this.defaultFrom };
  }

  /**
   * Dispatches an e-signing invitation to the recipient with dynamic template tokens
   */
  async sendSignatureInvitation(params: SignatureInvitationParams): Promise<boolean> {
    const {
      to,
      signerName,
      documentTitle,
      signingUrl,
      firmName = "SanSuite Accountants",
      message,
      expiresAt,
      customSubject,
      customBody,
      attachments = [],
      baseUrl: explicitBaseUrl,
    } = params;
    const baseUrl = explicitBaseUrl || await getAppBaseUrl();
    const fullUrl = signingUrl.startsWith("http")
      ? signingUrl
      : `${baseUrl}${signingUrl.startsWith("/") ? "" : "/"}${signingUrl}`;

    const replaceTokens = (text: string) => {
      return text
        .replace(/\{\{signerName\}\}/g, signerName)
        .replace(/\{\{documentTitle\}\}/g, documentTitle)
        .replace(/\{\{firmName\}\}/g, firmName)
        .replace(/\{\{signingUrl\}\}/g, fullUrl)
        .replace(/\{\{signingLink\}\}/g, fullUrl)
        .replace(/\{\{expiresAt\}\}/g, expiresAt ? new Date(expiresAt).toLocaleDateString("en-GB") : "14 days")
        .replace(/\{\{message\}\}/g, message || "");
    };

    const subject = customSubject
      ? replaceTokens(customSubject)
      : `Signature Request: ${documentTitle} from ${firmName}`;

    const formattedCustomBody = customBody
      ? replaceTokens(customBody).replace(/\n/g, "<br>")
      : null;

    const attachmentsHtml = attachments.length > 0
      ? `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">
            Attached Documents (${attachments.length})
          </div>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #334155;">
            ${attachments.map((a) => `<li><strong>${a.fileName}</strong></li>`).join("")}
          </ul>
        </div>
      `
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #6c5ce7; padding: 24px 32px; color: #ffffff; }
          .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
          .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.85; }
          .content { padding: 32px; }
          .document-box { background: #f1f5f9; border-left: 4px solid #6c5ce7; padding: 16px; border-radius: 6px; margin: 20px 0; }
          .document-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
          .document-meta { font-size: 12px; color: #64748b; margin-top: 4px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { background-color: #6c5ce7; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; }
          .footer { background: #f8fafc; padding: 20px 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>eSign E-Signature Request</h1>
            <p>Secure Electronic Document Execution Portal</p>
          </div>
          <div class="content">
            <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
              Hello <strong>${signerName}</strong>,
            </p>

            ${formattedCustomBody ? `
              <div style="font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
                ${formattedCustomBody}
              </div>
            ` : `
              <p style="font-size: 13px; line-height: 1.6; color: #475569;">
                <strong>${firmName}</strong> has prepared an electronic document package that requires your official review and signature.
              </p>
            `}

            ${message ? `
              <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 12px; color: #581c87; font-style: italic;">
                "${message}"
              </div>
            ` : ""}

            <div class="document-box">
              <div class="document-title">${documentTitle}</div>
              <div class="document-meta">Sent via eSign Secure Digital Gateway</div>
              ${expiresAt ? `<div class="document-meta" style="color: #d97706; margin-top: 4px;">Expires on: ${new Date(expiresAt).toLocaleDateString("en-GB")}</div>` : ""}
              ${attachmentsHtml}
            </div>

            <div class="btn-container">
              <a href="${fullUrl}" class="btn">Review & Sign Document</a>
            </div>

            <p style="font-size: 11px; color: #64748b; line-height: 1.5;">
              This signature request is encrypted and legally binding under the <strong>UK Electronic Communications Act 2000</strong> and EU/UK eIDAS Regulation. You do not need to create an account or install any software to sign.
            </p>
          </div>
          <div class="footer">
            Sent by ${firmName} using SanSuite eSign Platform.<br>
            If you did not expect this request, please contact your accounting advisor immediately.
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.sendMail(to, subject, html);
    return result.success;
  }

  /**
   * Dispatches a reminder to a pending signatory
   */
  async sendSignatureReminder(params: SignatureReminderParams): Promise<boolean> {
    const { to, signerName, documentTitle, signingUrl, firmName = "SanSuite Accountants", baseUrl: explicitBaseUrl } = params;
    const baseUrl = explicitBaseUrl || await getAppBaseUrl();
    const fullUrl = signingUrl.startsWith("http")
      ? signingUrl
      : `${baseUrl}${signingUrl.startsWith("/") ? "" : "/"}${signingUrl}`;

    const subject = `Reminder: Please sign ${documentTitle} from ${firmName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 20px; color: #1e293b;">
        <div style="max-width: 540px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 28px; border: 1px solid #e2e8f0;">
          <h2 style="color: #6c5ce7; font-size: 18px; margin-top: 0;">Signature Reminder</h2>
          <p style="font-size: 13px; line-height: 1.6;">
            Hello <strong>${signerName}</strong>,
          </p>
          <p style="font-size: 13px; line-height: 1.6; color: #475569;">
            This is a friendly reminder that <strong>${documentTitle}</strong> is still awaiting your electronic signature for <strong>${firmName}</strong>.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${fullUrl}" style="background: #6c5ce7; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
              Sign Document Now
            </a>
          </div>
          <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Sent by ${firmName} via SanSuite eSign.
          </p>
        </div>
      </body>
      </html>
    `;

    const result = await this.sendMail(to, subject, html);
    return result.success;
  }

  /**
   * Dispatches completion notice to the firm accountant
   */
  async sendSignatureCompletionNotice(params: SignatureCompletionParams): Promise<boolean> {
    const { to, signerName, documentTitle, completedAt, ipAddress = "Verified" } = params;
    const subject = `Completed: ${signerName} has signed ${documentTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 20px; color: #1e293b;">
        <div style="max-width: 540px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 28px; border: 1px solid #e2e8f0;">
          <h2 style="color: #10b981; font-size: 18px; margin-top: 0;">Document Successfully Signed</h2>
          <p style="font-size: 13px; line-height: 1.6;">
            Signatory <strong>${signerName}</strong> has electronically signed and approved:
          </p>
          <div style="background: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 13px; font-weight: 600; margin: 16px 0;">
            ${documentTitle}
          </div>
          <p style="font-size: 12px; color: #64748b;">
            Signed at: <strong>${new Date(completedAt).toLocaleString("en-GB")}</strong><br>
            Signer IP: <strong>${ipAddress}</strong>
          </p>
          <p style="font-size: 12px; color: #475569;">
            The document is now officially locked and ready for filing to Companies House / HMRC.
          </p>
        </div>
      </body>
      </html>
    `;

    const result = await this.sendMail(to, subject, html);
    return result.success;
  }

  /**
   * Dispatches a direct client email via SMTP with professional firm header/footer
   */
  async sendClientEmail(params: {
    to: string;
    cc?: string;
    subject: string;
    message: string;
    priority?: string;
    practiceName?: string;
    senderName?: string;
    senderEmail?: string;
    replyTo?: string;
    attachments?: Array<{
      fileName: string;
      contentType?: string;
      content?: string;
      url?: string;
    }>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, cc, subject, message, priority = "Normal", practiceName = "", senderName, senderEmail, replyTo, attachments = [] } = params;
    const { transporter, fromAddress } = await this.getTransporter();

    const formattedMessage = message.includes("<") ? message : message.replace(/\n/g, "<br>");

    const attachmentsHtml = attachments.length > 0
      ? `
        <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">
            Attached Documents (${attachments.length})
          </div>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #334155;">
            ${attachments.map((a) => `<li><strong>${a.fileName}</strong></li>`).join("")}
          </ul>
        </div>
      `
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #5c469c; padding: 20px 28px; color: #ffffff; }
          .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
          .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; }
          .content { padding: 28px; font-size: 14px; line-height: 1.6; color: #334155; }
          .footer { background: #f8fafc; padding: 16px 28px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${practiceName}</h1>
            <p>Official Client Communication</p>
          </div>
          <div class="content">
            <div style="font-size: 14px; line-height: 1.6; color: #1e293b;">
              ${formattedMessage}
            </div>
            ${attachmentsHtml}
          </div>
          <div class="footer">
            Sent by <strong>${senderName || practiceName}</strong> via SanSuite Practice Management.<br>
            Practice: ${practiceName}
          </div>
        </div>
      </body>
      </html>
    `;

    // Process attachments for Nodemailer
    const mailAttachments: any[] = [];
    for (const a of attachments) {
      if (a.content) {
        mailAttachments.push({
          filename: a.fileName,
          content: Buffer.from(a.content, "base64"),
          contentType: a.contentType,
        });
      } else if (a.url) {
        mailAttachments.push({
          filename: a.fileName,
          path: a.url,
          contentType: a.contentType,
        });
      }
    }

    if (transporter) {
      try {
        const rawSmtpEmail = fromAddress.includes("<")
          ? fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress
          : fromAddress;
        // Fully dynamic – no hardcoded fallback firm name or email
        const senderDisplayName = senderName || practiceName || "";
        const resolvedFrom = senderDisplayName ? `"${senderDisplayName}" <${rawSmtpEmail}>` : rawSmtpEmail;
        const resolvedReplyTo = senderEmail || rawSmtpEmail;

        const info: any = await transporter.sendMail({
          from: resolvedFrom,
          replyTo: resolvedReplyTo,
          to,
          cc: cc ? cc : undefined,
          subject,
          html,
          attachments: mailAttachments.length > 0 ? mailAttachments : undefined,
          priority: priority === "High" ? "high" : priority === "Low" ? "low" : "normal",
        });
        console.log(`[EmailService] Live direct email sent to ${to} (From: ${resolvedFrom}, Reply-To: ${resolvedReplyTo}, MessageId: ${info?.messageId})`);
        return { success: true, messageId: info?.messageId };
      } catch (err: any) {
        console.error(`[EmailService] Error dispatching email to ${to}:`, err);
        return { success: false, error: err.message || "Failed to send email via SMTP" };
      }
    } else {
      console.log(`[EmailService - SIMULATED DISPATCH] Direct Email to ${to}, Subject: ${subject}`);
      return { success: true, messageId: `sim-${Date.now()}` };
    }
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
    options?: {
      text?: string;
      cc?: string;
      attachments?: any[];
      fromName?: string;
      fromEmail?: string;
      replyTo?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { transporter, fromAddress } = await this.getTransporter();

    if (transporter) {
      try {
        const rawSmtpEmail = fromAddress.includes("<")
          ? fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress
          : fromAddress;
        // Fully dynamic – no hardcoded fallback firm name or email
        const senderDisplayName = options?.fromName || "";
        const resolvedFrom = senderDisplayName ? `"${senderDisplayName}" <${rawSmtpEmail}>` : rawSmtpEmail;
        const resolvedReplyTo = options?.replyTo || options?.fromEmail || rawSmtpEmail;

        const info: any = await transporter.sendMail({
          from: resolvedFrom,
          replyTo: resolvedReplyTo,
          to,
          cc: options?.cc ? options.cc : undefined,
          subject,
          text: options?.text || undefined,
          html,
          attachments: options?.attachments,
        });
        console.log(`[EmailService] Live email dispatched successfully to: ${to} (From: ${resolvedFrom}, Reply-To: ${resolvedReplyTo}, MessageId: ${info?.messageId})`);
        return { success: true, messageId: info?.messageId };
      } catch (error: any) {
        console.error(`[EmailService] Failed to send live email to ${to}:`, error);
        return { success: false, error: error.message };
      }
    } else {
      // Graceful simulated delivery (logged cleanly)
      console.log(`[EmailService - SIMULATED DISPATCH]
To: ${to}
Subject: ${subject}
Delivery Mode: Simulated (Configure Mail Server in System Admin Settings or .env for live inbox dispatch)
-----------------------------------------------------------`);
      return { success: true, messageId: `sim-${Date.now()}` };
    }
  }
}

export const emailService = new EmailService();
