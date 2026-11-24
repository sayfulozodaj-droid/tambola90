import env from "../config/env";

export interface SmsSender {
  send(phone: string, message: string): Promise<void>;
}

const normalizePhone = (raw: string): string => raw.replace(/[^\d+]/g, "");

/**
 * Пешниҳодҳои дастгирӣ:
 *   - "esmz"      → ESMZ (notify.eskiz.uz) — истифодаи SMS_API_KEY
 *   - "sms_gateway" → SMS Gateway / сервери дохилӣ — истифодаи SMS_GATEWAY_TOKEN
 *   - "stub"      → тана консол (барои dev/test)
 */
export const smsSender: SmsSender = {
  async send(phone: string, message: string): Promise<void> {
    const dest = normalizePhone(phone);

    if (env.smsProvider === "esmz" && env.smsApiKey) {
      try {
        const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.smsApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mobile_phone: dest, message }),
        });
        if (!res.ok) {
          console.warn(`[sms] ESMZ хато: ${res.status}. Код ба консол чоп мешавад.`);
          console.log(`[sms:stub] ${dest} → ${message}`);
        } else {
          return;
        }
      } catch (e) {
        console.warn("[sms] ESMZ дастрас нест, stub:", e);
      }
      return;
    }

    if (env.smsProvider === "sms_gateway") {
      try {
        const res = await fetch(env.smsGatewayUrl!, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.smsGatewayToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ to: dest, message }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn(
            `[sms] SMS Gateway хато ${res.status}: ${text.slice(0, 120)}`
          );
        } else {
          console.log(`[sms] SMS Gateway: ${dest} OK ${res.status}`);
          return;
        }
      } catch (e) {
        console.warn("[sms] SMS Gateway error:", e);
      }
      // fallback — код бе фиристодан мемонад
      console.log(`[sms:stub] ${dest} → ${message}`);
      return;
    }

    // stub ё provider-и номаълум
    console.log(`[sms:stub] ${dest} → ${message}`);
  },
};
