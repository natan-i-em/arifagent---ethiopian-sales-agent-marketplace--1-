-- PostgreSQL Migration for Azwari Merchant Wallet & Chapa Payment Integration
-- Enforces:
-- 1. Double balance (available, locked) with CHECK constraints >= 0
-- 2. Strictly append-only WalletTransaction ledger table (UPDATE and DELETE forbidden via trigger)
-- 3. Idempotent deposits (txRef UNIQUE) and payouts (reference UNIQUE)
-- 4. Cached banks for fast transfer lookup

-- 1. WALLET
CREATE TABLE IF NOT EXISTS "Wallet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerType" TEXT NOT NULL,
  "businessId" TEXT UNIQUE REFERENCES "Business"("id") ON DELETE CASCADE,
  "salesPartnerId" TEXT UNIQUE REFERENCES "SalesPartner"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "availableBalance" BIGINT NOT NULL DEFAULT 0,
  "lockedBalance" BIGINT NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_wallet_positive_available" CHECK ("availableBalance" >= 0),
  CONSTRAINT "chk_wallet_positive_locked" CHECK ("lockedBalance" >= 0),
  CONSTRAINT "chk_wallet_owner" CHECK ("businessId" IS NOT NULL OR "salesPartnerId" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "Wallet_businessId_idx" ON "Wallet"("businessId");
CREATE INDEX IF NOT EXISTS "Wallet_salesPartnerId_idx" ON "Wallet"("salesPartnerId");
CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId");

-- 2. APPEND-ONLY WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE RESTRICT,
  "type" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "ref" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "balanceAfterAvailable" BIGINT NOT NULL,
  "balanceAfterLocked" BIGINT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WalletTransaction_ref_idx" ON "WalletTransaction"("ref");

-- Enforce append-only on WalletTransaction
CREATE OR REPLACE FUNCTION prevent_wallet_transaction_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'WalletTransaction table is strictly append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_wallet_transaction_mod ON "WalletTransaction";
CREATE TRIGGER trg_prevent_wallet_transaction_mod
BEFORE UPDATE OR DELETE ON "WalletTransaction"
FOR EACH ROW EXECUTE FUNCTION prevent_wallet_transaction_modification();

-- 3. DEPOSITS
CREATE TABLE IF NOT EXISTS "Deposit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE RESTRICT,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
  "amount" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "txRef" TEXT NOT NULL UNIQUE,
  "chapaReference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "checkoutUrl" TEXT,
  "rawWebhookPayload" JSONB,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Deposit_txRef_idx" ON "Deposit"("txRef");
CREATE INDEX IF NOT EXISTS "Deposit_walletId_status_idx" ON "Deposit"("walletId", "status");
CREATE INDEX IF NOT EXISTS "Deposit_businessId_idx" ON "Deposit"("businessId");

-- 4. PAYOUTS
CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE RESTRICT,
  "salesPartnerId" TEXT NOT NULL REFERENCES "SalesPartner"("id") ON DELETE RESTRICT,
  "amount" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "bankCode" TEXT NOT NULL,
  "bankName" TEXT,
  "accountNumber" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "reference" TEXT NOT NULL UNIQUE,
  "chapaTransferId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  "rawWebhookPayload" JSONB,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Payout_reference_idx" ON "Payout"("reference");
CREATE INDEX IF NOT EXISTS "Payout_walletId_status_idx" ON "Payout"("walletId", "status");
CREATE INDEX IF NOT EXISTS "Payout_salesPartnerId_idx" ON "Payout"("salesPartnerId");

-- 5. CACHED BANKS
CREATE TABLE IF NOT EXISTS "CachedBank" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "acronym" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CachedBank_code_idx" ON "CachedBank"("code");
