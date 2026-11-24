import env from "../config/env";

export interface SmsSender {
  send(phone: string, message: string): Promise<void>;
}

/**
 * Агар SMS_PROVIDER=eskiz ва SMS_API_KEY мавҷуд бошад — тавассути Eskiz.uz фиристода мешавад,
 * дар акси ҳол код ба консол чоп мешавад (stub барои dev).
 */
export const smsSender: SmsSender = {
  async send(phone: string, message: string): Promise<void> {
    if (env.smsProvider === "eskiz" && env.smsApiKey) {
      try {
        const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.smsApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobile_phone: phone.replace(/[^\d]/g, ""),
            message,
          }),
        });
        if (!res.ok) {
          console.warn(`[sms] Eskiz хато: ${res.status}. Код ба консол чоп мешавад.`);
          console.log(`[sms:stub] ${phone} → ${message}`);
        }
        return;
      } catch (e) {
        console.warn("[sms] Eskiz дастрас нест, stub истифода мешавад:", e);
      }
    }
    console.log(`[sms:stub] ${phone} → ${message}`);
  },
};
