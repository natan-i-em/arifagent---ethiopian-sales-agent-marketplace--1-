import dotenv from 'dotenv';
import { prisma } from '../prisma.js';
import { normalizeEthiopianPhone } from '../middleware/validator.js';

dotenv.config();

export interface SmsSendParams {
  recipientPhone: string;
  messageBody: string;
  orderNumber?: string;
  templateName?: string;
}

export interface SmsSendResult {
  id: string;
  recipientPhone: string;
  templateName: string;
  orderNumber: string;
  messageBody: string;
  provider: 'SMS Ethiopia Gateway';
  status: 'delivered' | 'queued' | 'submitted' | 'failed';
  attempts: number;
  sentAt: string;
  providerRef: string;
  isSimulated?: boolean;
  error?: string;
}

/**
 * Service to handle SMS dispatch via SMS Ethiopia Gateway (smsethiopia.com)
 * Uses official API schema:
 * POST https://smsethiopia.com/api/sms/send
 * Headers: { 'KEY': 'YOUR_API_KEY', 'Content-Type': 'application/json' }
 * Body: { 'msisdn': '2519XXXXXXXX', 'text': 'message' }
 */
export class SmsEthiopiaService {
  private static getApiKey(): string {
    return (process.env.SMS_ETHIOPIA_API_KEY || '').trim();
  }

  private static getApiUrl(): string {
    return process.env.SMS_ETHIOPIA_API_URL || 'https://smsethiopia.com/api/sms/send';
  }

  /**
   * Dispatches an SMS through SMS Ethiopia Gateway (smsethiopia.com)
   */
  public static async sendSms(params: SmsSendParams): Promise<SmsSendResult> {
    const { recipientPhone, messageBody, orderNumber = '', templateName = 'general' } = params;

    const apiKey = this.getApiKey();
    const apiUrl = this.getApiUrl();

    // Normalize phone number to standard 2519... or 2517... format
    const phoneInfo = normalizeEthiopianPhone(recipientPhone);
    const msisdn = phoneInfo.isValid
      ? phoneInfo.normalized
      : recipientPhone.replace(/[\s\-\(\)\+]/g, '');

    const sentAt = new Date().toISOString();
    let status: 'delivered' | 'submitted' | 'failed' = 'delivered';
    let providerRef = 'ETH-SMS-' + Math.floor(100000 + Math.random() * 900000);
    let isSimulated = false;
    let errorMessage: string | undefined = undefined;

    // Check if live API Key is configured
    if (apiKey && apiKey.length > 0) {
      try {
        console.log(`[SMS Ethiopia] Dispatching live SMS to +${msisdn} via ${apiUrl}...`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'KEY': apiKey,
          },
          body: JSON.stringify({
            msisdn: msisdn,
            text: messageBody,
          }),
        });

        const responseData = await response.json().catch(() => ({}));

        if (response.ok) {
          status = 'delivered';
          providerRef =
            responseData.ref_id ||
            responseData.message_id ||
            responseData.id ||
            responseData.ticket ||
            providerRef;
          console.log(`[SMS Ethiopia] Live SMS sent successfully! Ref: ${providerRef}`);
        } else {
          errorMessage =
            responseData.error_message ||
            responseData.message ||
            responseData.error ||
            `Gateway HTTP ${response.status}`;
          console.error(`[SMS Ethiopia] Gateway error status ${response.status}:`, errorMessage);
          status = 'failed';
        }
      } catch (err: any) {
        errorMessage = err.message || 'Network/HTTP connection failure';
        console.error('[SMS Ethiopia] Network/HTTP error communicating with SMS Ethiopia API:', err);
        status = 'failed';
      }
    } else {
      // Test / Development Mode (Simulates delivery if API key is not yet set)
      isSimulated = true;
      console.log(`\n======================================================`);
      console.log(`[SMS Ethiopia (smsethiopia.com) - Simulation Mode]`);
      console.log(`Endpoint:    POST ${apiUrl}`);
      console.log(`msisdn:      ${msisdn} (${phoneInfo.carrier})`);
      console.log(`text:        "${messageBody}"`);
      console.log(`Order Ref:   ${orderNumber || 'N/A'}`);
      console.log(`Template:    ${templateName}`);
      console.log(`Status:      Delivered (Provider Ref: ${providerRef})`);
      console.log(`Note: Set SMS_ETHIOPIA_API_KEY in .env to dispatch live SMS.`);
      console.log(`======================================================\n`);
    }

    const smsRecord: SmsSendResult = {
      id: 'sms_' + Date.now().toString(36),
      recipientPhone,
      templateName,
      orderNumber,
      messageBody,
      provider: 'SMS Ethiopia Gateway',
      status,
      attempts: 1,
      sentAt,
      providerRef,
      isSimulated,
      error: errorMessage,
    };

    // Persist SMS log to Supabase PostgreSQL database table SmsLog
    try {
      await prisma.smsLog.create({
        data: {
          recipientPhone,
          templateName,
          orderNumber: orderNumber || null,
          messageBody,
          provider: 'SMS Ethiopia Gateway',
          providerRef,
          status,
        },
      });
    } catch (dbErr) {
      console.warn('[SMS Ethiopia] Notice: Could not write to SmsLog table in database:', dbErr);
    }

    return smsRecord;
  }

  /**
   * Retrieves recent SMS logs from database
   */
  public static async getRecentLogs(limit = 50) {
    try {
      return await prisma.smsLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.error('[SMS Ethiopia] Failed to fetch SMS outbox:', err);
      return [];
    }
  }

  /**
   * Health status of SMS provider
   */
  public static getStatus() {
    const apiKey = this.getApiKey();
    return {
      provider: 'SMS Ethiopia Gateway (smsethiopia.com)',
      configured: Boolean(apiKey && apiKey.length > 0),
      apiUrl: this.getApiUrl(),
      mode: apiKey ? 'LIVE' : 'SIMULATION',
    };
  }
}
