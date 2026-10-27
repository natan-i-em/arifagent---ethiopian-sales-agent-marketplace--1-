import { prisma } from '../src/prisma';
import { supabaseAdmin } from '../src/supabase';
import dotenv from 'dotenv';

dotenv.config();

async function createSuperAdmin() {
  const args = process.argv.slice(2);
  const email = (args[0] || 'admin@azwari.et').trim().toLowerCase();
  const password = args[1] || 'Admin@2026!';
  const fullName = args[2] || 'Platform Super Admin';
  const phone = args[3] || '+251 911 000000';

  console.log('=====================================================');
  console.log('   AZWARI ETHIOPIA - SUPER ADMIN ACCOUNT PROVISIONING');
  console.log('=====================================================');
  console.log(`Email:     ${email}`);
  console.log(`Password:  ${password}`);
  console.log(`Name:      ${fullName}`);
  console.log(`Phone:     ${phone}`);
  console.log(`Role:      admin`);
  console.log('-----------------------------------------------------');

  if (password.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  let authUserId: string | null = null;

  try {
    console.log('1. Connecting to Supabase Auth...');
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        fullName,
        role: 'admin',
        phone,
      },
    });

    if (created?.user) {
      authUserId = created.user.id;
      console.log(`   ✓ Supabase Auth user created (ID: ${authUserId})`);
    } else if (createErr) {
      console.log(`   ℹ User exists in Supabase Auth, updating password & metadata...`);
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const users = (listData?.users ?? []) as Array<{ id: string; email?: string }>;
      const found = users.find((u) => u.email?.toLowerCase() === email);

      if (found) {
        authUserId = found.id;
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(found.id, {
          password,
          email_confirm: true,
          user_metadata: {
            fullName,
            role: 'admin',
            phone,
          },
        });
        if (updateErr) {
          console.warn(`   ⚠ Notice updating Supabase user: ${updateErr.message}`);
        } else {
          console.log(`   ✓ Supabase Auth password & metadata updated successfully.`);
        }
      } else {
        console.warn(`   ⚠ Supabase notice: ${createErr.message}`);
      }
    }
  } catch (err: any) {
    console.warn(`   ⚠ Supabase operation warning: ${err?.message}`);
  }

  const userId = authUserId || 'admin_' + Date.now().toString(36);

  try {
    console.log('2. Provisioning in PostgreSQL Database (Prisma User table)...');
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'admin',
        fullName,
        phone,
        ...(authUserId ? { authUserId } : {}),
      },
      create: {
        id: userId,
        authUserId: authUserId || userId,
        email,
        fullName,
        phone,
        role: 'admin',
        subcity: 'Bole Central',
      },
    });

    console.log('=====================================================');
    console.log('🎉 SUPER ADMIN SUCCESSFULLY CONFIGURED!');
    console.log('=====================================================');
    console.log(`ID:       ${user.id}`);
    console.log(`Email:    ${user.email}`);
    console.log(`Name:     ${user.fullName}`);
    console.log(`Role:     ${user.role} (Super Admin)`);
    console.log('');
    console.log('How to Sign In:');
    console.log('1. Go to http://localhost:3000 in your browser.');
    console.log('2. Click "Sign In" in the top navigation bar.');
    console.log('3. Select "Admin" account type tab.');
    console.log(`4. Enter Email: ${email}`);
    console.log(`5. Enter Password: ${password}`);
    console.log('6. Click "Sign In as Super Admin" to enter the Operations & Compliance Console!');
    console.log('=====================================================');
  } catch (dbErr: any) {
    console.error('❌ Database error provisioning super admin:', dbErr);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
