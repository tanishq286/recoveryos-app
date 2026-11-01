import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { Env } from "../../config/env.js";

/**
 * The document vault. Objects are always encrypted at rest: AES-256-GCM on
 * local disk, SSE-KMS (or SSE-S3) in S3. Callers keep only the returned URL.
 */
export interface DocumentStorage {
  readonly name: string;
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  get(url: string): Promise<Buffer>;
}

export const DOCUMENT_STORAGE = Symbol("DOCUMENT_STORAGE");

function vaultKey(keyB64: string | undefined): Buffer {
  const key = keyB64
    ? Buffer.from(keyB64, "base64")
    : createHash("sha256").update("recoveryos-development-only:storage").digest();
  if (key.length !== 32)
    throw new Error("STORAGE_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  return key;
}

function seal(key: Buffer, body: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([Buffer.from("ROS1"), iv, cipher.getAuthTag(), data]);
}

function open(key: Buffer, raw: Buffer): Buffer {
  if (raw.subarray(0, 4).toString() !== "ROS1") throw new Error("Unrecognised vault object.");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(4, 16));
  decipher.setAuthTag(raw.subarray(16, 32));
  return Buffer.concat([decipher.update(raw.subarray(32)), decipher.final()]);
}

/** Minimal slice of the Prisma client the database vault needs. */
interface StoredObjects {
  storedObject: {
    upsert(args: {
      where: { key: string };
      create: { key: string; data: Uint8Array<ArrayBuffer>; contentType: string };
      update: { data: Uint8Array<ArrayBuffer>; contentType: string };
    }): Promise<unknown>;
    findUnique(args: {
      where: { key: string };
      select: { data: true };
    }): Promise<{ data: Uint8Array } | null>;
  };
}

/** Encrypted objects in Postgres: for hosts without a persistent disk, such as Vercel. */
export class DatabaseEncryptedStorage implements DocumentStorage {
  readonly name = "db";
  private readonly key: Buffer;

  constructor(
    private readonly db: StoredObjects,
    keyB64: string | undefined,
  ) {
    this.key = vaultKey(keyB64);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    const data = new Uint8Array(seal(this.key, body));
    await this.db.storedObject.upsert({
      where: { key },
      create: { key, data, contentType },
      update: { data, contentType },
    });
    return `db://${key}`;
  }

  async get(url: string): Promise<Buffer> {
    if (!url.startsWith("db://")) throw new Error("Not a database storage URL.");
    const row = await this.db.storedObject.findUnique({
      where: { key: url.slice("db://".length) },
      select: { data: true },
    });
    if (!row) throw new Error("Vault object not found.");
    return open(this.key, Buffer.from(row.data));
  }
}

export class LocalEncryptedStorage implements DocumentStorage {
  readonly name = "local";
  private readonly root: string;
  private readonly key: Buffer;

  constructor(dir: string, keyB64: string | undefined) {
    this.root = resolve(process.cwd(), dir);
    this.key = keyB64
      ? Buffer.from(keyB64, "base64")
      : createHash("sha256").update("recoveryos-development-only:storage").digest();
    if (this.key.length !== 32)
      throw new Error("STORAGE_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  }

  private pathFor(key: string): string {
    const full = resolve(this.root, key);
    if (!full.startsWith(this.root + sep)) throw new Error("Storage key escapes the vault.");
    return full;
  }

  async put(key: string, body: Buffer): Promise<string> {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const data = Buffer.concat([cipher.update(body), cipher.final()]);
    const out = Buffer.concat([Buffer.from("ROS1"), iv, cipher.getAuthTag(), data]);
    const path = this.pathFor(`${key}.enc`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, out, { mode: 0o600 });
    return `local://${key}`;
  }

  async get(url: string): Promise<Buffer> {
    if (!url.startsWith("local://")) throw new Error("Not a local storage URL.");
    const raw = await readFile(this.pathFor(`${url.slice("local://".length)}.enc`));
    if (raw.subarray(0, 4).toString() !== "ROS1") throw new Error("Unrecognised vault object.");
    const decipher = createDecipheriv("aes-256-gcm", this.key, raw.subarray(4, 16));
    decipher.setAuthTag(raw.subarray(16, 32));
    return Buffer.concat([decipher.update(raw.subarray(32)), decipher.final()]);
  }
}

export class S3Storage implements DocumentStorage {
  readonly name = "s3";
  private readonly s3: S3Client;

  constructor(
    private readonly bucket: string,
    region: string,
    private readonly kmsKeyId?: string,
    endpoint?: string,
  ) {
    this.s3 = new S3Client({ region, ...(endpoint ? { endpoint, forcePathStyle: true } : {}) });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(this.kmsKeyId
          ? { ServerSideEncryption: "aws:kms", SSEKMSKeyId: this.kmsKeyId }
          : { ServerSideEncryption: "AES256" }),
      }),
    );
    return `s3://${this.bucket}/${key}`;
  }

  async get(url: string): Promise<Buffer> {
    const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(url);
    if (!m) throw new Error("Not an S3 URL.");
    const res = await this.s3.send(new GetObjectCommand({ Bucket: m[1], Key: m[2] }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
}

export function createStorage(env: Env, db?: StoredObjects): DocumentStorage {
  if (env.STORAGE_PROVIDER === "db") {
    if (!db) throw new Error("STORAGE_PROVIDER=db needs the database client.");
    return new DatabaseEncryptedStorage(db, env.STORAGE_ENCRYPTION_KEY);
  }
  if (env.STORAGE_PROVIDER === "s3") {
    if (!env.S3_BUCKET) throw new Error("S3_BUCKET is required when STORAGE_PROVIDER=s3.");
    return new S3Storage(env.S3_BUCKET, env.S3_REGION, env.S3_KMS_KEY_ID, env.S3_ENDPOINT);
  }
  return new LocalEncryptedStorage(join(env.STORAGE_LOCAL_DIR), env.STORAGE_ENCRYPTION_KEY);
}
