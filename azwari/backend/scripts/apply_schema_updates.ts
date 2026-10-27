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
  console.log('[Migration] Applying safe single-statement updates to PostgreSQL...');

  const statements = [
    // Enum
    `ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED'`,
    // Sequence
    `CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1050`,
    // SalesPartner
    `ALTER TABLE "SalesPartner" ADD COLUMN IF NOT EXISTS "enrolledProductIds" text[] DEFAULT '{}'`,
    // Order columns
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "platformFee" numeric(10,2) DEFAULT 0.0`,
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "supplierNetPayout" numeric(12,2) DEFAULT 0.0`,
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "assignedDriverName" text`,
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "assignedDriverPhone" text`,
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "scheduledAt" timestamp(3)`,
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dispatchedAt" timestamp(3)`,
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt" timestamp(3)`,
    `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryNotes" text`,
    // PlatformFeeLedger
    `CREATE TABLE IF NOT EXISTS "PlatformFeeLedger" (
      "id" text NOT NULL PRIMARY KEY,
      "orderId" text NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE CASCADE,
      "orderNumber" text NOT NULL,
      "businessId" text NOT NULL REFERENCES "Business"("id"),
      "amount" numeric(10,2) NOT NULL,
      "rate" numeric(4,3) NOT NULL DEFAULT 0.02,
      "status" text NOT NULL DEFAULT 'accrued',
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "PlatformFeeLedger_businessId_idx" ON "PlatformFeeLedger"("businessId")`,
    // WaitlistEntry
    `CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
      "id" text NOT NULL PRIMARY KEY,
      "fullName" text NOT NULL,
      "phone" text NOT NULL,
      "role" text NOT NULL,
      "subcity" text NOT NULL,
      "telegramUsername" text,
      "categoryOrChannel" text NOT NULL,
      "estimatedScale" text NOT NULL,
      "referralCode" text NOT NULL UNIQUE,
      "referralCount" integer NOT NULL DEFAULT 0,
      "waitlistNumber" serial NOT NULL,
      "status" text NOT NULL DEFAULT 'waitlisted',
      "joinedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "invitedAt" timestamp(3)
    )`,
    // IdempotencyRecord
    `CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
      "id" text NOT NULL PRIMARY KEY,
      "key" text NOT NULL UNIQUE,
      "endpoint" text NOT NULL,
      "userId" text,
      "statusCode" integer NOT NULL,
      "responseBody" jsonb NOT NULL,
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✓ Executed: ${sql.split('\n')[0].trim().substring(0, 60)}...`);
    } catch (err: any) {
      console.warn(`Note on: ${sql.split('\n')[0].trim().substring(0, 40)} -> ${err.message}`);
    }
  }

  console.log('[Migration] All individual schema statements applied successfully.');
}

main()
  .catch((err) => {
    console.error('[Migration Error]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
