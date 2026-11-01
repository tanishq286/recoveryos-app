-- Encrypted document vault inside Postgres, for serverless hosts with no
-- persistent disk (STORAGE_PROVIDER=db). Bodies are AES-256-GCM ciphertext.
CREATE TABLE "stored_objects" (
    "key" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "content_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_objects_pkey" PRIMARY KEY ("key")
);
