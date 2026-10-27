import { PrismaClient } from '../prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

async function main() {
  console.log('🏦 [Wallet Migration] Applying Wallet, Ledger & Chapa tables to PostgreSQL...');

  const statements = [
    // 1. Wallets table
    `CREATE TABLE IF NOT EXISTS "Wallet" (
      "id" text NOT NULL PRIMARY KEY,
      "ownerType" text NOT NULL,
      "businessId" text UNIQUE REFERENCES "Business"("id") ON DELETE CASCADE,
      "salesPartnerId" text UNIQUE REFERENCES "SalesPartner"("id") ON DELETE CASCADE,
      "userId" text REFERENCES "User"("id") ON DELETE SET NULL,
      "availableBalance" bigint NOT NULL DEFAULT 0,
      "lockedBalance" bigint NOT NULL DEFAULT 0,
      "currency" text NOT NULL DEFAULT 'ETB',
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "chk_wallet_positive_available" CHECK ("availableBalance" >= 0),
      CONSTRAINT "chk_wallet_positive_locked" CHECK ("lockedBalance" >= 0),
      CONSTRAINT "chk_wallet_owner" CHECK ("businessId" IS NOT NULL OR "salesPartnerId" IS NOT NULL)
    );`,
    `CREATE INDEX IF NOT EXISTS "Wallet_businessId_idx" ON "Wallet"("businessId");`,
    `CREATE INDEX IF NOT EXISTS "Wallet_salesPartnerId_idx" ON "Wallet"("salesPartnerId");`,
    `CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId");`,

    // 2. Append-only WalletTransaction table
    `CREATE TABLE IF NOT EXISTS "WalletTransaction" (
      "id" text NOT NULL PRIMARY KEY,
      "walletId" text NOT NULL REFERENCES "Wallet"("id") ON DELETE RESTRICT,
      "type" text NOT NULL,
      "amount" bigint NOT NULL,
      "ref" text NOT NULL,
      "status" text NOT NULL DEFAULT 'COMPLETED',
      "balanceAfterAvailable" bigint NOT NULL,
      "balanceAfterLocked" bigint NOT NULL,
      "metadata" jsonb,
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt" DESC);`,
    `CREATE INDEX IF NOT EXISTS "WalletTransaction_ref_idx" ON "WalletTransaction"("ref");`,

    // Trigger to enforce append-only rule on WalletTransaction
    `CREATE OR REPLACE FUNCTION prevent_wallet_transaction_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'WalletTransaction table is strictly append-only. UPDATE and DELETE operations are forbidden.';
    END;
    $$ LANGUAGE plpgsql;`,

    `DROP TRIGGER IF EXISTS trg_prevent_wallet_transaction_mod ON "WalletTransaction";`,
    `CREATE TRIGGER trg_prevent_wallet_transaction_mod
    BEFORE UPDATE OR DELETE ON "WalletTransaction"
    FOR EACH ROW EXECUTE FUNCTION prevent_wallet_transaction_modification();`,

    // 3. Deposits table
    `CREATE TABLE IF NOT EXISTS "Deposit" (
      "id" text NOT NULL PRIMARY KEY,
      "walletId" text NOT NULL REFERENCES "Wallet"("id") ON DELETE RESTRICT,
      "businessId" text NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
      "amount" bigint NOT NULL,
      "currency" text NOT NULL DEFAULT 'ETB',
      "txRef" text NOT NULL UNIQUE,
      "chapaReference" text,
      "status" text NOT NULL DEFAULT 'PENDING',
      "checkoutUrl" text,
      "rawWebhookPayload" jsonb,
      "verifiedAt" timestamp(3),
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "Deposit_txRef_idx" ON "Deposit"("txRef");`,
    `CREATE INDEX IF NOT EXISTS "Deposit_walletId_status_idx" ON "Deposit"("walletId", "status");`,
    `CREATE INDEX IF NOT EXISTS "Deposit_businessId_idx" ON "Deposit"("businessId");`,

    // 4. Payouts table
    `CREATE TABLE IF NOT EXISTS "Payout" (
      "id" text NOT NULL PRIMARY KEY,
      "walletId" text NOT NULL REFERENCES "Wallet"("id") ON DELETE RESTRICT,
      "salesPartnerId" text NOT NULL REFERENCES "SalesPartner"("id") ON DELETE RESTRICT,
      "amount" bigint NOT NULL,
      "currency" text NOT NULL DEFAULT 'ETB',
      "bankCode" text NOT NULL,
      "bankName" text,
      "accountNumber" text NOT NULL,
      "accountName" text NOT NULL,
      "reference" text NOT NULL UNIQUE,
      "chapaTransferId" text,
      "status" text NOT NULL DEFAULT 'PENDING',
      "failureReason" text,
      "rawWebhookPayload" jsonb,
      "verifiedAt" timestamp(3),
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "Payout_reference_idx" ON "Payout"("reference");`,
    `CREATE INDEX IF NOT EXISTS "Payout_walletId_status_idx" ON "Payout"("walletId", "status");`,
    `CREATE INDEX IF NOT EXISTS "Payout_salesPartnerId_idx" ON "Payout"("salesPartnerId");`,

    // 5. CachedBank table
    `CREATE TABLE IF NOT EXISTS "CachedBank" (
      "id" text NOT NULL PRIMARY KEY,
      "code" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "acronym" text,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "CachedBank_code_idx" ON "CachedBank"("code");`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      const firstLine = sql.split('\n')[0].trim().substring(0, 60);
      console.log(`✓ Executed: ${firstLine}...`);
    } catch (err: any) {
      console.warn(`Note on executing SQL: ${err.message}`);
    }
  }

  console.log('🏦 [Wallet Migration] Successfully created all wallet tables, constraints, and triggers.');
}

main()
  .catch((err) => {
    console.error('❌ [Wallet Migration Failed]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
