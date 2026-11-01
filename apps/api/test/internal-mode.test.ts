import { describe, expect, it } from "vitest";

import { loadEnv } from "../src/config/env.js";
import { InternalOtpSender } from "../src/common/providers/otp.provider.js";
import { DatabaseEncryptedStorage } from "../src/common/providers/storage.provider.js";
import { OtpService } from "../src/modules/auth/otp.service.js";

const JWT = "a-production-session-secret-of-at-least-32-chars";

describe("production environment without SMS or eSign keys", () => {
  it("starts on the internal stand-ins and derives the other secrets", () => {
    const env = loadEnv({ NODE_ENV: "production", JWT_SECRET: JWT });
    expect(env.OTP_PROVIDER).toBe("internal");
    expect(env.ESIGN_PROVIDER).toBe("mock");
    expect(env.STORAGE_PROVIDER).toBe("db");
    expect(env.OTP_SECRET).not.toBe(JWT);
    expect(env.OTP_SECRET).not.toBe(env.ESIGN_WEBHOOK_SECRET);
    expect(Buffer.from(env.STORAGE_ENCRYPTION_KEY!, "base64")).toHaveLength(32);
  });

  it("switches to the real providers once their keys are set", () => {
    const env = loadEnv({
      NODE_ENV: "production",
      JWT_SECRET: JWT,
      MSG91_AUTH_KEY: "k",
      MSG91_TEMPLATE_ID: "t",
      LEEGALITY_AUTH_TOKEN: "l",
    });
    expect(env.OTP_PROVIDER).toBe("msg91");
    expect(env.ESIGN_PROVIDER).toBe("leegality");
  });

  it("still refuses to start without JWT_SECRET", () => {
    expect(() => loadEnv({ NODE_ENV: "production" })).toThrow(/JWT_SECRET/);
  });
});

function otpService(role: string | null) {
  const prisma = {
    client: {
      otpChallenge: { findMany: async () => [], create: async () => ({}) },
      user: { findUnique: async () => (role ? { role } : null) },
    },
  };
  const env = loadEnv({ NODE_ENV: "test" });
  return new OtpService(prisma as never, new InternalOtpSender(), env);
}

describe("internal OTP", () => {
  it("shows the code to a new or investor number", async () => {
    for (const role of [null, "INVESTOR", "ASSOCIATE"]) {
      const res = await otpService(role).request("9876543210", "LOGIN", null);
      expect(res.channel).toBe("internal");
      expect(res.testCode).toMatch(/^\d{6}$/);
    }
  });

  it("never shows a staff account's code", async () => {
    for (const role of ["SUPER_ADMIN", "VALUATION_ANALYST", "LEGAL_OPS_EXEC"]) {
      const res = await otpService(role).request("9000000001", "LOGIN", null);
      expect(res).not.toHaveProperty("testCode");
    }
  });
});

describe("database vault", () => {
  it("stores ciphertext and reads back the original", async () => {
    const rows = new Map<string, Uint8Array>();
    const db = {
      storedObject: {
        upsert: async (a: { where: { key: string }; create: { data: Uint8Array } }) =>
          rows.set(a.where.key, a.create.data),
        findUnique: async (a: { where: { key: string } }) => {
          const data = rows.get(a.where.key);
          return data ? { data } : null;
        },
      },
    };
    const vault = new DatabaseEncryptedStorage(db as never, undefined);
    const body = Buffer.from("%PDF-1.7 Digital Mandate FE-0001");
    const url = await vault.put("cases/x/mandate.pdf", body, "application/pdf");
    expect(url).toBe("db://cases/x/mandate.pdf");
    expect(Buffer.from(rows.get("cases/x/mandate.pdf")!).includes(body)).toBe(false);
    expect((await vault.get(url)).equals(body)).toBe(true);
    await expect(vault.get("db://missing")).rejects.toThrow(/not found/);
  });
});
