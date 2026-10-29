import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Field-level encryption for folio numbers (AES-256-GCM) and a keyed blind
 * index (HMAC-SHA256) so imports can find duplicates without decrypting.
 *
 * Keys come from FOLIO_ENCRYPTION_KEY and FOLIO_HASH_KEY (32 bytes, base64).
 * Outside production a fixed development key is derived instead, and a
 * production process without real keys refuses to start (see keysFromEnv).
 */

const VERSION = "v1";

export interface FieldKeys {
  encryptionKey: Buffer;
  hashKey: Buffer;
}

function devKey(label: string): Buffer {
  return createHash("sha256").update(`recoveryos-development-only:${label}`).digest();
}

function decodeKey(name: string, value: string | undefined): Buffer | null {
  if (!value) return null;
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error(`${name} must be 32 bytes, base64-encoded.`);
  return key;
}

export function keysFromEnv(env: NodeJS.ProcessEnv = process.env): FieldKeys {
  const encryptionKey = decodeKey("FOLIO_ENCRYPTION_KEY", env.FOLIO_ENCRYPTION_KEY);
  const hashKey = decodeKey("FOLIO_HASH_KEY", env.FOLIO_HASH_KEY);
  if ((!encryptionKey || !hashKey) && env.NODE_ENV === "production") {
    throw new Error("FOLIO_ENCRYPTION_KEY and FOLIO_HASH_KEY are required in production.");
  }
  return {
    encryptionKey: encryptionKey ?? devKey("folio-encryption"),
    hashKey: hashKey ?? devKey("folio-hash"),
  };
}

export function encryptField(plain: string, keys: FieldKeys): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.encryptionKey, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(
    ":",
  );
}

export function decryptField(stored: string, keys: FieldKeys): string {
  const [version, iv, tag, data] = stored.split(":");
  if (version !== VERSION || !iv || !tag || !data)
    throw new Error("Unrecognised ciphertext format.");
  const decipher = createDecipheriv("aes-256-gcm", keys.encryptionKey, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString(
    "utf8",
  );
}

/** Case- and space-insensitive keyed hash of a folio number. */
export function blindIndex(value: string, keys: FieldKeys): string {
  return createHmac("sha256", keys.hashKey)
    .update(value.replace(/\s+/g, "").toUpperCase())
    .digest("hex");
}
