-- Enum values get their own migration: a new value cannot be used in the transaction that adds it.
ALTER TYPE "CorporateActionType" ADD VALUE IF NOT EXISTS 'CASH_ENTITLEMENT';
-- Statements that give neither a state nor a PIN code.
ALTER TYPE "IndianState" ADD VALUE IF NOT EXISTS 'UNKNOWN';
