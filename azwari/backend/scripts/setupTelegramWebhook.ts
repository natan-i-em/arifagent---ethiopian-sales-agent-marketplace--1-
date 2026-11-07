import dotenv from 'dotenv';
dotenv.config();

async function setupWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const username = process.env.TELEGRAM_BOT_USERNAME || 'AzwariMerchantBot';
  const backendUrl = process.argv[2] || process.env.BACKEND_URL || 'https://azwari.onrender.com';
  const webhookUrl = `${backendUrl.replace(/\/$/, '')}/api/telegram/webhook`;

  console.log('\n======================================================');
  console.log('🤖 AZWARI TELEGRAM BOT SETUP UTILITY');
  console.log('======================================================\n');

  if (!token || token.trim().length < 10) {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN is missing or invalid in your .env file.');
    console.error('   Please add the following to azwari/backend/.env:');
    console.error('   TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"');
    console.error('   TELEGRAM_BOT_USERNAME="your_bot_username"\n');
    process.exit(1);
  }

  try {
    // 1. Verify Bot Token with getMe
    console.log('📡 Step 1: Testing Bot Authentication with Telegram...');
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();

    if (!meData.ok) {
      console.error('❌ Authentication failed:', meData.description);
      console.error('   Please verify that your TELEGRAM_BOT_TOKEN is correct.\n');
      process.exit(1);
    }

    const botInfo = meData.result;
    console.log(`✅ Authenticated successfully!`);
    console.log(`   Bot Name: ${botInfo.first_name}`);
    console.log(`   Bot Username: @${botInfo.username}`);
    console.log(`   Bot ID: ${botInfo.id}\n`);

    // 2. Register Webhook
    console.log(`📡 Step 2: Registering Webhook -> ${webhookUrl}...`);
    const hookRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      }),
    });
    const hookData = await hookRes.json();

    if (!hookData.ok) {
      console.error('❌ Failed to set webhook:', hookData.description);
      process.exit(1);
    }

    console.log(`✅ Webhook set successfully!`);
    console.log(`   Description: ${hookData.description}\n`);

    // 3. Check Webhook Info
    console.log('📡 Step 3: Verifying Webhook Info...');
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const infoData = await infoRes.json();

    if (infoData.ok) {
      const info = infoData.result;
      console.log(`   URL: ${info.url}`);
      console.log(`   Has Custom Certificate: ${info.has_custom_certificate}`);
      console.log(`   Pending Update Count: ${info.pending_update_count}`);
      if (info.last_error_message) {
        console.warn(`   ⚠️ Last Error: ${info.last_error_message}`);
      }
    }

    console.log('\n======================================================');
    console.log('🎉 TELEGRAM BOT IS FULLY CONFIGURED & READY FOR ORDERS!');
    console.log(`   Merchants can connect via: https://t.me/${botInfo.username}`);
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('❌ Network error during setup:', err.message);
    process.exit(1);
  }
}

setupWebhook();
