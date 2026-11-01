import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { Env } from "../../config/env.js";

/**
 * Aadhaar eSign for the client mandate (R.E.C.O.V.E.R. step 5).
 *
 * The flow is the same for every provider: we upload the Scope of Work PDF,
 * the client signs on the provider's page with an Aadhaar OTP, and the
 * provider calls our webhook. Only a webhook that passes verification can mark
 * a mandate signed.
 *
 * The Digio and Leegality adapters follow their published v2/v3 request
 * shapes; confirm field names and the webhook signature scheme against your
 * account's documentation before going live. The simulated provider is the
 * development default and is refused in production.
 */
export interface SignRequestInput {
  caseCode: string;
  pdf: Buffer;
  signer: { name: string; phone: string; email?: string | null };
  callbackUrl: string;
}

export interface SignRequest {
  requestId: string;
  /** Where to send the client to sign; null for the simulated provider, which signs in-app. */
  signUrl: string | null;
}

export interface WebhookResult {
  requestId: string;
  status: "SIGNED" | "FAILED";
}

export interface EsignProvider {
  readonly name: "mock" | "digio" | "leegality";
  createSignRequest(input: SignRequestInput): Promise<SignRequest>;
  /** Returns the verified event, or null when the signature or payload is not valid. */
  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): WebhookResult | null;
}

export const ESIGN_PROVIDER = Symbol("ESIGN_PROVIDER");

function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const v = headers[name.toLowerCase()];
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export function signWebhookBody(body: string | Buffer, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Simulated eSign: the client completes a mock Aadhaar OTP step inside our modal. */
export class MockEsignProvider implements EsignProvider {
  readonly name = "mock" as const;
  constructor(private readonly secret: string) {}

  async createSignRequest(): Promise<SignRequest> {
    return { requestId: `MOCK-${randomUUID()}`, signUrl: null };
  }

  /** Builds the signed webhook the simulated provider would send. */
  buildWebhook(requestId: string): { body: string; signature: string } {
    const body = JSON.stringify({
      requestId,
      status: "SIGNED",
      signedAt: new Date().toISOString(),
    });
    return { body, signature: signWebhookBody(body, this.secret) };
  }

  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): WebhookResult | null {
    const sig = header(headers, "x-recoveryos-signature");
    if (!sig || !safeEqualHex(sig, signWebhookBody(rawBody, this.secret))) return null;
    const body = JSON.parse(rawBody.toString("utf8")) as { requestId?: string; status?: string };
    if (!body.requestId || (body.status !== "SIGNED" && body.status !== "FAILED")) return null;
    return { requestId: body.requestId, status: body.status };
  }
}

export class DigioEsignProvider implements EsignProvider {
  readonly name = "digio" as const;
  constructor(
    private readonly baseUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly webhookSecret: string,
  ) {}

  async createSignRequest(input: SignRequestInput): Promise<SignRequest> {
    const identifier = input.signer.email ?? input.signer.phone.replace(/^\+91/, "");
    const res = await fetch(`${this.baseUrl}/v2/client/document/uploadpdf`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        signers: [
          {
            identifier,
            name: input.signer.name,
            reason: `Recovery mandate ${input.caseCode}`,
            sign_type: "aadhaar",
          },
        ],
        expire_in_days: 10,
        display_on_page: "last",
        notify_signers: true,
        file_name: `${input.caseCode}-scope-of-work.pdf`,
        file_data: input.pdf.toString("base64"),
      }),
    });
    if (!res.ok) throw new Error(`Digio rejected the sign request (${res.status}).`);
    const doc = (await res.json()) as { id: string };
    return {
      requestId: doc.id,
      signUrl: `https://app.digio.in/#/gateway/login/${doc.id}/${randomUUID()}/${identifier}`,
    };
  }

  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): WebhookResult | null {
    const sig = header(headers, "x-digio-checksum");
    if (!sig || !safeEqualHex(sig, signWebhookBody(rawBody, this.webhookSecret))) return null;
    const body = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      payload?: { document?: { id?: string; agreement_status?: string } };
    };
    const doc = body.payload?.document;
    if (!doc?.id) return null;
    const signed = body.event === "doc.signed" || doc.agreement_status === "completed";
    return { requestId: doc.id, status: signed ? "SIGNED" : "FAILED" };
  }
}

export class LeegalityEsignProvider implements EsignProvider {
  readonly name = "leegality" as const;
  constructor(
    private readonly baseUrl: string,
    private readonly authToken: string,
    private readonly privateSalt: string,
  ) {}

  async createSignRequest(input: SignRequestInput): Promise<SignRequest> {
    const res = await fetch(`${this.baseUrl}/sign/request`, {
      method: "POST",
      headers: { "x-auth-token": this.authToken, "content-type": "application/json" },
      body: JSON.stringify({
        file: { name: `${input.caseCode}-scope-of-work.pdf`, file: input.pdf.toString("base64") },
        invitees: [
          {
            name: input.signer.name,
            phone: input.signer.phone.replace(/^\+91/, ""),
            email: input.signer.email ?? undefined,
            signatures: [{ type: "AADHAAR" }],
          },
        ],
        irn: input.caseCode,
      }),
    });
    if (!res.ok) throw new Error(`Leegality rejected the sign request (${res.status}).`);
    const body = (await res.json()) as {
      data?: { documentId?: string; invitees?: { signUrl?: string }[] };
    };
    if (!body.data?.documentId) throw new Error("Leegality did not return a document id.");
    return { requestId: body.data.documentId, signUrl: body.data.invitees?.[0]?.signUrl ?? null };
  }

  verifyWebhook(rawBody: Buffer): WebhookResult | null {
    const body = JSON.parse(rawBody.toString("utf8")) as {
      documentId?: string;
      mac?: string;
      webhookType?: string;
    };
    if (!body.documentId || !body.mac) return null;
    const expected = createHmac("sha1", this.privateSalt).update(body.documentId).digest("hex");
    if (!safeEqualHex(body.mac, expected)) return null;
    return {
      requestId: body.documentId,
      status: body.webhookType === "Success" ? "SIGNED" : "FAILED",
    };
  }
}

export function createEsignProvider(env: Env): EsignProvider {
  switch (env.ESIGN_PROVIDER) {
    case "digio":
      if (!env.DIGIO_CLIENT_ID || !env.DIGIO_CLIENT_SECRET)
        throw new Error("DIGIO_CLIENT_ID and DIGIO_CLIENT_SECRET are required.");
      return new DigioEsignProvider(
        env.DIGIO_BASE_URL,
        env.DIGIO_CLIENT_ID,
        env.DIGIO_CLIENT_SECRET,
        env.ESIGN_WEBHOOK_SECRET,
      );
    case "leegality":
      if (!env.LEEGALITY_AUTH_TOKEN) throw new Error("LEEGALITY_AUTH_TOKEN is required.");
      return new LeegalityEsignProvider(
        env.LEEGALITY_BASE_URL,
        env.LEEGALITY_AUTH_TOKEN,
        env.ESIGN_WEBHOOK_SECRET,
      );
    default:
      return new MockEsignProvider(env.ESIGN_WEBHOOK_SECRET);
  }
}
