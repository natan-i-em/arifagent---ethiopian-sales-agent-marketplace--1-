import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../prisma/client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('[SECURITY] Inspecting public schema tables for RLS configuration...');

  const tables: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `);

  console.log(`[SECURITY] Found ${tables.length} tables in public schema.`);

  for (const { tablename } of tables) {
    console.log(`[SECURITY] Hardening "${tablename}" with RLS...`);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${tablename}" ENABLE ROW LEVEL SECURITY;
    `);

    const policyName = `service_role_all_${tablename}`;
    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "${policyName}" ON "${tablename}";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${policyName}" ON "${tablename}"
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    `);
  }

  console.log('[SECURITY] All tables successfully locked down with Row Level Security.');
}

main()
  .catch((e) => {
    console.error('[SECURITY ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
