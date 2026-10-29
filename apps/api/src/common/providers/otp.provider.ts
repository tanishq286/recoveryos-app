import { Logger } from "@nestjs/common";

import type { Env } from "../../config/env.js";

/** Sends a one-time code. The code is generated and checked by AuthService, never here. */
export interface OtpSender {
  readonly name: string;
  send(phoneE164: string, code: string): Promise<void>;
}

export const OTP_SENDER = Symbol("OTP_SENDER");

/**
 * Development and tests: prints the code to the API log and remembers the
 * latest one per phone so end-to-end tests can read it. Refused in production
 * by the env schema.
 */
export class ConsoleOtpSender implements OtpSender {
  readonly name = "console";
  private readonly log = new Logger("OTP");
  private readonly last = new Map<string, string>();

  async send(phone: string, code: string) {
    this.last.set(phone, code);
    this.log.warn(`Development OTP for ${phone}: ${code}`);
  }

  lastCode(phone: string): string | undefined {
    return this.last.get(phone);
  }
}

/** MSG91 OTP API v5 with a DLT-approved template. */
export class Msg91OtpSender implements OtpSender {
  readonly name = "msg91";
  constructor(
    private readonly authKey: string,
    private readonly templateId: string,
  ) {}

  async send(phone: string, code: string) {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", this.templateId);
    url.searchParams.set("mobile", phone.replace(/^\+/, ""));
    url.searchParams.set("otp", code);
    const res = await fetch(url, {
      method: "POST",
      headers: { authkey: this.authKey, "content-type": "application/json" },
    });
    if (!res.ok) throw new Error(`MSG91 rejected the OTP request (${res.status}).`);
  }
}

/** Twilio Programmable Messaging. */
export class TwilioOtpSender implements OtpSender {
  readonly name = "twilio";
  constructor(
    private readonly sid: string,
    private readonly token: string,
    private readonly from: string,
  ) {}

  async send(phone: string, code: string) {
    const body = new URLSearchParams({
      To: phone,
      From: this.from,
      Body: `${code} is your RecoveryOS verification code. It expires in 5 minutes. Never share it with anyone who calls you, including us.`,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${this.sid}:${this.token}`).toString("base64")}`,
        },
        body,
      },
    );
    if (!res.ok) throw new Error(`Twilio rejected the OTP message (${res.status}).`);
  }
}

export function createOtpSender(env: Env): OtpSender {
  switch (env.OTP_PROVIDER) {
    case "msg91":
      if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID)
        throw new Error("MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required.");
      return new Msg91OtpSender(env.MSG91_AUTH_KEY, env.MSG91_TEMPLATE_ID);
    case "twilio":
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM)
        throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are required.");
      return new TwilioOtpSender(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, env.TWILIO_FROM);
    default:
      return new ConsoleOtpSender();
  }
}
