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

    // 2. Handle inline button callback query (stk:<orderId>:yes|no)
    if (update?.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const chatId = cq.message?.chat?.id;
      const messageId = cq.message?.message_id;

      if (data.startsWith('stk:')) {
        const [, orderId, decision] = data.split(':');
        await this.answerCallbackQuery(cq.id, decision === 'yes' ? 'Stock confirmed!' : 'Marked out of stock');

        return {
          handled: true,
          action: decision === 'yes' ? 'confirm_stock' : 'reject_stock',
          orderId,
        };
      }
    }

    return { handled: false };
  }
}

