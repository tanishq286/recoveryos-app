import { z } from "zod";

/**
 * Environment, validated once at start-up. Every integration has a local
 * default (console OTP, simulated eSign, encrypted local storage, Postgres
 * search, inline jobs) so the API runs with nothing but a database; set the
 * provider variables to switch each one to its real service.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().default("postgresql://postgres:postgres@127.0.0.1:54329/recoveryos"),
    WEB_ORIGIN: z.string().default("http://localhost:3000"),
    API_PUBLIC_URL: z.string().default("http://localhost:4000"),

    JWT_SECRET: z.string().min(32).optional(),
    OTP_SECRET: z.string().min(32).optional(),
    SESSION_TTL_HOURS: z.coerce.number().default(24 * 7),

    OTP_PROVIDER: z.enum(["console", "msg91", "twilio"]).default("console"),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_TEMPLATE_ID: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM: z.string().optional(),

    ESIGN_PROVIDER: z.enum(["mock", "digio", "leegality"]).default("mock"),
    ESIGN_WEBHOOK_SECRET: z.string().min(16).optional(),
    DIGIO_CLIENT_ID: z.string().optional(),
    DIGIO_CLIENT_SECRET: z.string().optional(),
    DIGIO_BASE_URL: z.string().default("https://ext.digio.in:444"),
    LEEGALITY_AUTH_TOKEN: z.string().optional(),
    LEEGALITY_BASE_URL: z.string().default("https://app1.leegality.com/api/v3.0"),

    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("../../.uploads"),
    STORAGE_ENCRYPTION_KEY: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("ap-south-1"),
    S3_KMS_KEY_ID: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),

    REDIS_URL: z.string().optional(),
    MEILI_HOST: z.string().optional(),
    MEILI_API_KEY: z.string().optional(),

    /** Valuation PDF reports a mobile number may download per day. */
    VALUATION_REPORTS_PER_DAY: z.coerce.number().int().min(0).default(2),
    /** Searches a signed-in member may run per day before an analyst takes over. */
    MEMBER_SEARCHES_PER_DAY: z.coerce.number().int().min(1).default(60),
    /** On-demand refresh of company-published statements when a search runs. Off under test. */
    LIVE_SYNC_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? process.env.NODE_ENV !== "test" : v === "true")),
    /** Load the search indexes into cache on start-up. Off under test. */
    PREWARM_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? process.env.NODE_ENV !== "test" : v === "true")),
    /** Hours before the same company's published statements are fetched again. */
    LIVE_SYNC_TTL_HOURS: z.coerce.number().min(1).default(24),
    /** Live NSE/BSE price sync. Off by default under test. */
    MARKET_SYNC_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? process.env.NODE_ENV !== "test" : v === "true")),
    MARKET_SYNC_INTERVAL_MINUTES: z.coerce.number().min(1).default(15),
    MAX_UPLOAD_MB: z.coerce.number().default(10),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    for (const key of [
      "JWT_SECRET",
      "OTP_SECRET",
      "ESIGN_WEBHOOK_SECRET",
      "STORAGE_ENCRYPTION_KEY",
    ] as const) {
      if (env.STORAGE_PROVIDER === "s3" && key === "STORAGE_ENCRYPTION_KEY") continue;
      if (!env[key])
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required in production` });
    }
    if (env.OTP_PROVIDER === "console")
      ctx.addIssue({
        code: "custom",
        path: ["OTP_PROVIDER"],
        message: "console OTP is for development only",
      });
    if (env.ESIGN_PROVIDER === "mock")
      ctx.addIssue({
        code: "custom",
        path: ["ESIGN_PROVIDER"],
        message: "mock eSign is for development only",
      });
  });

export type Env = z.infer<typeof schema> & {
  JWT_SECRET: string;
  OTP_SECRET: string;
  ESIGN_WEBHOOK_SECRET: string;
};

const DEV_SECRET = (label: string) => `finsol-development-only-${label}-0123456789abcdef`;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${lines}`);
  }
  const env = parsed.data;
  return {
    ...env,
    JWT_SECRET: env.JWT_SECRET ?? DEV_SECRET("session"),
    OTP_SECRET: env.OTP_SECRET ?? DEV_SECRET("otp"),
    ESIGN_WEBHOOK_SECRET: env.ESIGN_WEBHOOK_SECRET ?? DEV_SECRET("esign"),
  };
}

export const ENV = Symbol("ENV");
