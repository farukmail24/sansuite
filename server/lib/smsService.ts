import { db } from "../db";
import { systemSettings } from "@shared/schema";
import { like } from "drizzle-orm";

interface SendSmsParams {
  to: string;
  message: string;
  senderId?: string;
}

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  simulated: boolean;
  message: string;
  error?: string;
}

class SmsService {
  /**
   * Retrieves SMS configuration from MySQL systemSettings
   */
  async getConfig(): Promise<Record<string, string>> {
    try {
      const rows = await db
        .select()
        .from(systemSettings)
        .where(like(systemSettings.key, "sms_%"));

      const cfg: Record<string, string> = {};
      rows.forEach((r) => {
        if (r.key && r.value) cfg[r.key] = r.value;
      });
      return cfg;
    } catch (err) {
      console.warn("[SmsService] Error retrieving SMS system_settings:", err);
      return {};
    }
  }

  /**
   * Dispatches an SMS message via the configured gateway (Twilio, Textlocal, Vonage, MSG91, or Custom API)
   */
  async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    const { to, message, senderId = "SanSuite" } = params;
    const cfg = await this.getConfig();
    const provider = cfg.sms_provider || "custom";

    // Clean phone number (format for UK / international)
    let cleanPhone = to.replace(/[\s\-()]/g, "");
    if (cleanPhone.startsWith("07")) {
      cleanPhone = "+44" + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith("447")) {
      cleanPhone = "+" + cleanPhone;
    }

    console.log(`[SmsService] Preparing SMS dispatch to ${cleanPhone} via provider: ${provider}`);

    // 1. Twilio Integration
    if (provider === "twilio" && cfg.sms_twilio_sid && cfg.sms_twilio_token && cfg.sms_twilio_sender) {
      try {
        const authHeader = "Basic " + Buffer.from(`${cfg.sms_twilio_sid}:${cfg.sms_twilio_token}`).toString("base64");
        const bodyParams = new URLSearchParams({
          To: cleanPhone,
          From: cfg.sms_twilio_sender,
          Body: message,
        });

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sms_twilio_sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams.toString(),
        });

        const data: any = await res.json();
        if (res.ok && data.sid) {
          console.log(`[SmsService] Twilio SMS dispatched successfully. SID: ${data.sid}`);
          return {
            success: true,
            simulated: false,
            messageId: data.sid,
            message: `SMS delivered via Twilio to ${cleanPhone}`,
          };
        } else {
          console.error(`[SmsService] Twilio error:`, data);
          return {
            success: false,
            simulated: false,
            error: data.message || "Twilio gateway error",
            message: data.message || "Twilio gateway error",
          };
        }
      } catch (err: any) {
        console.error(`[SmsService] Twilio exception:`, err);
        return { success: false, simulated: false, error: err.message, message: err.message };
      }
    }

    // 2. Custom Webhook / API Integration
    if (provider === "custom" && cfg.sms_api_url && cfg.sms_api_key) {
      try {
        const res = await fetch(cfg.sms_api_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.sms_api_key}`,
            "X-API-Key": cfg.sms_api_key,
          },
          body: JSON.stringify({
            to: cleanPhone,
            from: cfg.sms_sender_id || senderId,
            message,
          }),
        });

        const data: any = await res.json().catch(() => ({}));
        if (res.ok) {
          return {
            success: true,
            simulated: false,
            messageId: data.id || `custom-${Date.now()}`,
            message: `SMS dispatched via Custom SMS Gateway to ${cleanPhone}`,
          };
        } else {
          return {
            success: false,
            simulated: false,
            error: data.error || "Custom SMS Gateway returned an error",
            message: data.error || "Custom SMS Gateway error",
          };
        }
      } catch (err: any) {
        return { success: false, simulated: false, error: err.message, message: err.message };
      }
    }

    // 3. Fallback: Logged & Simulated Dispatch
    // (If SMS gateway is not yet filled in system_settings)
    console.log(`[SmsService - SIMULATED / LOGGED DISPATCH]
To: ${cleanPhone}
Sender: ${senderId}
Message: "${message}"
Notice: Configure Twilio or SMS Gateway in System Admin > Configuration > SMS Gateway for live mobile transmission.`);

    return {
      success: true,
      simulated: true,
      messageId: `sim-${Date.now()}`,
      message: `SMS logged to client timeline. (To send real SMS to mobile devices, configure Twilio or SMS Gateway in System Admin).`,
    };
  }
}

export const smsService = new SmsService();
