import { prisma } from '../prisma.js';

export interface StockVerificationAlertParams {
  orderId: string;
  orderNumber: string;
  publicAccessToken: string;
  productName: string;
  quantity: number;
  subtotal: number;
  supplierNetPayout: number;
  deliverySubcity: string;
  salesPartnerName: string;
  salesPartnerPhone: string;
  businessId: string;
  businessName: string;
  telegramChatId?: string | null;
  phone: string;
}

export interface PaymentVerificationAlertParams {
  orderId: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  supplierNetPayout: number;
  buyerName: string;
  buyerPhone: string;
  provider: string;
  transactionReference: string;
  amountShown: number;
  receiptImageUrl?: string | null;
  receiptNote?: string | null;
  businessId: string;
  businessName: string;
  telegramChatId?: string | null;
}

export class TelegramBotService {
  private static get token(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN;
  }

  public static get botUsername(): string {
    return process.env.TELEGRAM_BOT_USERNAME || 'AzwariMerchantBot';
  }

  public static isConfigured(): boolean {
    return Boolean(this.token && this.token.trim().length > 10);
  }

  /**
   * Generates a deep link for a merchant to start the bot and connect their store
   */
  public static getConnectUrl(businessId: string): string {
    return `https://t.me/${this.botUsername}?start=biz_${businessId}`;
  }

  /**
   * Send arbitrary message to a Telegram chat
   */
  public static async sendMessage(chatId: string | number, text: string, replyMarkup?: any): Promise<any> {
    if (!this.isConfigured()) {
      console.log(`[TelegramBot MOCK] to ${chatId}: "${text.slice(0, 80)}..."`);
      return { ok: true, mocked: true };
    }

    try {
      const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });
      return await res.json();
    } catch (err: any) {
      console.warn('[TelegramBot Error]', err.message);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Edit existing message text and keyboard (useful after merchant taps a callback button)
   */
  public static async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    replyMarkup?: any
  ): Promise<any> {
    if (!this.isConfigured()) return { ok: true, mocked: true };

    try {
      const url = `https://api.telegram.org/bot${this.token}/editMessageText`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });
      return await res.json();
    } catch (err: any) {
      console.warn('[TelegramBot Edit Error]', err.message);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Edit existing message caption (for messages with photos)
   */
  public static async editMessageCaption(
    chatId: string | number,
    messageId: number,
    caption: string,
    replyMarkup?: any
  ): Promise<any> {
    if (!this.isConfigured()) return { ok: true, mocked: true };

    try {
      const url = `https://api.telegram.org/bot${this.token}/editMessageCaption`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      });
      return await res.json();
    } catch (err: any) {
      console.warn('[TelegramBot EditCaption Error]', err.message);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Send a photo to a Telegram chat with caption and optional inline keyboard
   */
  public static async sendPhoto(
    chatId: string | number,
    photoUrl: string,
    caption: string,
    replyMarkup?: any
  ): Promise<any> {
    if (!this.isConfigured()) {
      console.log(`[TelegramBot MOCK PHOTO] to ${chatId}: ${photoUrl?.slice(0, 50)}...`);
      return { ok: true, mocked: true };
    }

    try {
      // 1. If photoUrl is an HTTP/HTTPS URL, send as JSON payload
      if (photoUrl && /^https?:\/\//i.test(photoUrl)) {
        const url = `https://api.telegram.org/bot${this.token}/sendPhoto`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: photoUrl,
            caption,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          }),
        });
        const data = await res.json();
        if (data.ok) return data;
      }

      // 2. If photoUrl is a Base64 / Data URL, send via multipart FormData
      if (photoUrl && photoUrl.startsWith('data:image/')) {
        const mime = photoUrl.split(',')[0].split(':')[1].split(';')[0];
        const base64Data = photoUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: mime });

        const formData = new FormData();
        formData.append('chat_id', String(chatId));
        formData.append('photo', blob, 'receipt.jpg');
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
        if (replyMarkup) {
          formData.append('reply_markup', JSON.stringify(replyMarkup));
        }

        const url = `https://api.telegram.org/bot${this.token}/sendPhoto`;
        const res = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.ok) return data;
      }

      // 3. Fallback: Send caption and receipt link via regular text message
      return await this.sendMessage(chatId, `${caption}\n\n📷 <i>[Receipt Screenshot Attached]</i>`, replyMarkup);
    } catch (err: any) {
      console.warn('[TelegramBot sendPhoto Error]', err.message);
      return await this.sendMessage(chatId, caption, replyMarkup);
    }
  }

  /**
   * Answer callback query (stops loading spinner on Telegram button)
   */
  public static async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<any> {
    if (!this.isConfigured()) return { ok: true, mocked: true };

    try {
      const url = `https://api.telegram.org/bot${this.token}/answerCallbackQuery`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: false,
        }),
      });
    } catch {}
  }

  /**
   * Send the live stock check prompt to the merchant via Telegram
   */
  public static async sendStockVerificationRequest(params: StockVerificationAlertParams): Promise<boolean> {
    if (!params.telegramChatId) {
      return false;
    }

    const messageText = 
      `🔔 <b>LIVE ORDER STOCK CHECK</b>\n\n` +
      `<b>Order:</b> #${params.orderNumber}\n` +
      `📦 <b>Product:</b> ${params.productName}\n` +
      `🔢 <b>Quantity:</b> ${params.quantity} unit(s)\n` +
      `📍 <b>Delivery Area:</b> ${params.deliverySubcity} Subcity\n` +
      `💰 <b>Your Payout:</b> ETB ${params.supplierNetPayout.toLocaleString()}\n` +
      `🧑‍💼 <b>Sales Agent:</b> ${params.salesPartnerName}\n\n` +
      `<i>Do you physically have this item in stock in your store right now?</i>\n` +
      `<i>(Customer has NOT been sent a payment link yet)</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '✅ YES, IN STOCK (Hold 45m)',
            callback_data: `stk:${params.orderId}:yes`,
          },
        ],
        [
          {
            text: '❌ OUT OF STOCK / SOLD OUT',
            callback_data: `stk:${params.orderId}:no`,
          },
        ],
      ],
    };

    const res = await this.sendMessage(params.telegramChatId, messageText, inlineKeyboard);
    return res.ok === true;
  }

  /**
   * Send payment receipt verification request to the merchant via Telegram
   */
  public static async sendPaymentVerificationRequest(params: PaymentVerificationAlertParams): Promise<boolean> {
    if (!params.telegramChatId) {
      return false;
    }

    const caption =
      `🧾 <b>CUSTOMER PAYMENT RECEIPT SUBMITTED</b>\n\n` +
      `<b>Order:</b> #${params.orderNumber}\n` +
      `📦 <b>Product:</b> ${params.productName} (${params.quantity} unit)\n` +
      `💳 <b>Payment Method:</b> ${params.provider}\n` +
      `🔢 <b>Reference / Tx ID:</b> <code>${params.transactionReference}</code>\n` +
      `💰 <b>Amount Transferred:</b> ETB ${params.amountShown.toLocaleString()}\n` +
      `💵 <b>Your Net Payout:</b> ETB ${params.supplierNetPayout.toLocaleString()}\n` +
      `👤 <b>Customer:</b> ${params.buyerName} (${params.buyerPhone})\n` +
      (params.receiptNote ? `📝 <b>Customer Note:</b> <i>"${params.receiptNote}"</i>\n` : '') +
      `\n<i>Please check your bank statement. Did you receive this transfer?</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '✅ APPROVE PAYMENT & DISPATCH',
            callback_data: `pay:${params.orderId}:approve`,
          },
        ],
        [
          {
            text: '❌ REJECT RECEIPT (Not in Statement)',
            callback_data: `pay:${params.orderId}:reject`,
          },
        ],
      ],
    };

    if (params.receiptImageUrl) {
      const res = await this.sendPhoto(params.telegramChatId, params.receiptImageUrl, caption, inlineKeyboard);
      return res.ok === true;
    } else {
      const res = await this.sendMessage(params.telegramChatId, caption, inlineKeyboard);
      return res.ok === true;
    }
  }

  /**
   * Process incoming Telegram webhook updates (/start biz_<id> or inline button callbacks)
   */
  public static async handleWebhookUpdate(update: any): Promise<{ handled: boolean; action?: string; orderId?: string }> {
    // 1. Handle /start command with business deep-link
    if (update?.message?.text?.startsWith('/start')) {
      const text = update.message.text.trim();
      const chatId = String(update.message.chat.id);
      const username = update.message.from?.username || update.message.from?.first_name || 'Merchant';

      const match = text.match(/\/start\s+biz_([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const businessId = match[1];
        const biz = await prisma.business.findUnique({ where: { id: businessId } });
        if (biz) {
          await prisma.business.update({
            where: { id: businessId },
            data: {
              telegramChatId: chatId,
              telegramUsername: username,
              telegramConnectedAt: new Date(),
            },
          });

          await this.sendMessage(
            chatId,
            `👋 <b>Selam ${biz.name}!</b>\n\n` +
            `Your merchant store is now connected to <b>Azwari Ethiopia</b>.\n\n` +
            `Whenever a sales agent in Addis Ababa has an interested customer, you will receive an instant <b>1-tap stock check</b> right here.\n\n` +
            `• You don't need spreadsheets or stock apps.\n` +
            `• Just tap <b>[IN STOCK]</b> to lock the item or <b>[SOLD OUT]</b> if it was sold to a walk-in customer.\n` +
            `• When customer pays, their receipt screenshot will appear right here for 1-tap verification!\n` +
            `• Customers only receive their payment link once you verify.`
          );

          return { handled: true, action: 'merchant_linked' };
        }
      }

      await this.sendMessage(
        chatId,
        `👋 Welcome to the <b>Azwari Ethiopia Merchant Bot</b>.\n\n` +
        `To link your shop, please tap the <b>"Connect Telegram Bot"</b> button inside your Azwari Supplier Portal.`
      );
      return { handled: true, action: 'welcome' };
    }

    // 2. Handle inline button callback queries (stk: and pay:)
    if (update?.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const chatId = cq.message?.chat?.id;
      const messageId = cq.message?.message_id;
      const isPhotoMessage = Boolean(cq.message?.photo);

      // Stock Decision Callback
      if (data.startsWith('stk:')) {
        const [, orderId, decision] = data.split(':');
        const isYes = decision === 'yes';
        await this.answerCallbackQuery(cq.id, isYes ? 'Stock confirmed!' : 'Marked out of stock');

        // Update telegram message inline to reflect final decision
        if (chatId && messageId) {
          const confirmationText = isYes
            ? `✅ <b>IN-STORE STOCK CONFIRMED!</b>\nItem held for 45 minutes. Payment instructions sent to buyer via SMS.`
            : `❌ <b>OUT OF STOCK / SOLD OUT</b>\nItem zeroed out in catalog. Order cancelled. Customer shielded from notifications.`;
          await this.editMessageText(chatId, messageId, confirmationText).catch(() => {});
        }

        return {
          handled: true,
          action: isYes ? 'confirm_stock' : 'reject_stock',
          orderId,
        };
      }

      // Payment Verification Decision Callback
      if (data.startsWith('pay:')) {
        const [, orderId, decision] = data.split(':');
        const isApproved = decision === 'approve';
        await this.answerCallbackQuery(cq.id, isApproved ? 'Payment approved!' : 'Receipt rejected');

        // Update telegram message/caption inline to reflect final decision
        if (chatId && messageId) {
          const resultCaption = isApproved
            ? `✅ <b>PAYMENT VERIFIED & APPROVED!</b>\nPayment confirmed via Telegram. Order moved to packaging & driver dispatch.`
            : `❌ <b>PAYMENT RECEIPT REJECTED</b>\nReceipt rejected via Telegram. Customer was notified to review their transfer or re-upload.`;

          if (isPhotoMessage) {
            await this.editMessageCaption(chatId, messageId, resultCaption).catch(() => {});
          } else {
            await this.editMessageText(chatId, messageId, resultCaption).catch(() => {});
          }
        }

        return {
          handled: true,
          action: isApproved ? 'approve_payment' : 'reject_payment',
          orderId,
        };
      }
    }

    return { handled: false };
  }
}

