import crypto from 'crypto';
import { walletConfig, centsToEtb, etbToCents } from '../config/walletConfig.js';
import { prisma } from '../prisma.js';

export interface ChapaInitializeParams {
  amountCents: bigint;
  currency?: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  txRef: string;
  callbackUrl?: string;
  returnUrl?: string;
  customization?: {
    title?: string;
    description?: string;
  };
}

export interface ChapaInitializeResponse {
  checkoutUrl: string;
  txRef: string;
  status: string;
  rawResponse: any;
}

export interface ChapaVerifyTransactionResponse {
  status: 'success' | 'failed' | 'pending';
  txRef: string;
  amountCents: bigint;
  currency: string;
  charge?: number;
  reference?: string;
  rawResponse: any;
}

export interface ChapaBank {
  id: string;
  code: string;
  name: string;
  acronym?: string;
}

export interface ChapaTransferParams {
  accountNumber: string;
  accountName: string;
  amountCents: bigint;
  bankCode: string;
  reference: string;
  currency?: string;
}

export interface ChapaTransferResponse {
  status: 'success' | 'failed' | 'pending' | 'queued';
  reference: string;
  transferId?: string;
  rawResponse: any;
}

export interface ChapaBalanceResponse {
  currency: string;
  balanceCents: bigint;
  rawResponse: any;
}

export class ChapaService {
  private static cachedBanks: ChapaBank[] = [];
  private static bankCacheExpiresAt: number = 0;
  private static readonly BANK_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Sanitizes request or response payloads for safe logging (removes tokens/secrets)
   */
  private static sanitizeForLogging(data: any): any {
    if (!data) return data;
    try {
      const cloned = JSON.parse(JSON.stringify(data));
      if (typeof cloned === 'object') {
        for (const key of Object.keys(cloned)) {
          const lower = key.toLowerCase();
          if (lower.includes('secret') || lower.includes('key') || lower.includes('token') || lower.includes('authorization') || lower.includes('password')) {
            cloned[key] = '[REDACTED]';
          }
        }
      }
      return cloned;
    } catch {
      return '[Unparseable Data]';
    }
  }

  /**
   * Safe logger for all Chapa HTTP interactions without leaking sensitive keys
   */
  private static logChapaCall(direction: 'REQUEST' | 'RESPONSE', endpoint: string, payload: any) {
    const timestamp = new Date().toISOString();
    console.log(`[CHAPA ${direction}] ${timestamp} | ${endpoint}`, JSON.stringify(this.sanitizeForLogging(payload)));
  }

  /**
   * Generic request helper to Chapa API
   */
  private static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const secretKey = walletConfig.chapaSecretKey;
    const url = `${walletConfig.chapaBaseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
      ...(options.headers as Record<string, string>),
    };

    this.logChapaCall('REQUEST', endpoint, {
      method: options.method || 'GET',
      headers: { ...headers, Authorization: 'Bearer [REDACTED]' },
      body: options.body ? JSON.parse(options.body as string) : undefined,
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let responseData: any;
    const responseText = await response.text();
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawText: responseText };
    }

    this.logChapaCall('RESPONSE', endpoint, {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    });

    if (!response.ok) {
      let errorMsg = `Chapa API error (${response.status}): ${response.statusText}`;
      const msgObj = responseData?.message || responseData?.error;
      if (typeof msgObj === 'string') {
        errorMsg = msgObj;
      } else if (msgObj && typeof msgObj === 'object') {
        errorMsg = Object.entries(msgObj)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ');
      }
      throw new Error(errorMsg);
    }

    return responseData as T;
  }

  /**
   * Initialize a deposit payment on Chapa
   * POST /v1/transaction/initialize
   */
  public static async initializePayment(params: ChapaInitializeParams): Promise<ChapaInitializeResponse> {
    const amountEtb = centsToEtb(params.amountCents);

    // Normalize Ethiopian phone number for Chapa (converts +251 9... or 2519... to 09...)
    let sanitizedPhone = (params.phoneNumber || '').trim().replace(/[^\d+]/g, '');
    if (sanitizedPhone.startsWith('+251')) {
      sanitizedPhone = '0' + sanitizedPhone.substring(4);
    } else if (sanitizedPhone.startsWith('251')) {
      sanitizedPhone = '0' + sanitizedPhone.substring(3);
    }
    sanitizedPhone = sanitizedPhone.replace(/\D/g, '');
    if (!sanitizedPhone || sanitizedPhone.length < 9) {
      sanitizedPhone = '0911223344';
    }

    // Chapa restrictions:
    // title: max 16 chars
    // description: max 50 chars, only letters, numbers, hyphens, underscores, spaces, and dots
    const title = (params.customization?.title || 'Azwari Deposit').slice(0, 16);
    const description = (params.customization?.description || `Deposit ${amountEtb} ETB`)
      .replace(/[^a-zA-Z0-9\-_ .]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);

    let returnUrl = params.returnUrl || walletConfig.chapaReturnUrl;
    if (returnUrl && !returnUrl.includes('tx_ref=')) {
      const sep = returnUrl.includes('?') ? '&' : '?';
      returnUrl = `${returnUrl}${sep}tx_ref=${params.txRef}`;
    }

    const bodyPayload = {
      amount: amountEtb.toFixed(2),
      currency: params.currency || 'ETB',
      email: params.email,
      first_name: (params.firstName || 'Merchant').trim(),
      last_name: (params.lastName || 'Azwari').trim(),
      phone_number: sanitizedPhone,
      tx_ref: params.txRef,
      callback_url: params.callbackUrl || walletConfig.chapaCallbackUrl,
      return_url: returnUrl,
      customization: {
        title,
        description,
      },
    };

    // If sandbox / test mock mode without secret key:
    if (!walletConfig.chapaSecretKey || walletConfig.chapaSecretKey.startsWith('mock_')) {
      console.warn('[CHAPA SANDBOX MOCK] Using simulated checkout URL for txRef:', params.txRef);
      return {
        checkoutUrl: `https://checkout.chapa.co/checkout/payment/mock-${params.txRef}`,
        txRef: params.txRef,
        status: 'success',
        rawResponse: { message: 'Mock link generated', status: 'success' },
      };
    }

    const data = await this.request<any>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });

    const checkoutUrl = data?.data?.checkout_url || data?.checkout_url;
    if (!checkoutUrl) {
      throw new Error(`Chapa did not return a valid checkout_url. Response: ${JSON.stringify(data)}`);
    }

    return {
      checkoutUrl,
      txRef: params.txRef,
      status: data.status || 'success',
      rawResponse: data,
    };
  }

  /**
   * Verify transaction payment status directly from Chapa
   * GET /v1/transaction/verify/{tx_ref}
   */
  public static async verifyTransaction(txRef: string): Promise<ChapaVerifyTransactionResponse> {
    if (!walletConfig.chapaSecretKey || walletConfig.chapaSecretKey.startsWith('mock_')) {
      console.warn('[CHAPA SANDBOX MOCK] Mock transaction verification for:', txRef);
      return {
        status: 'success',
        txRef,
        amountCents: etbToCents(500),
        currency: 'ETB',
        reference: `MOCK-${Date.now()}`,
        rawResponse: { status: 'success', tx_ref: txRef, amount: 500 },
      };
    }

    const data = await this.request<any>(`/transaction/verify/${encodeURIComponent(txRef)}`, {
      method: 'GET',
    });

    const chapaData = data.data || data;
    const isSuccess = data.status === 'success' || chapaData.status === 'success';
    const amountVal = Number(chapaData.amount || 0);

    return {
      status: isSuccess ? 'success' : (chapaData.status || 'failed'),
      txRef: chapaData.tx_ref || txRef,
      amountCents: etbToCents(amountVal),
      currency: chapaData.currency || 'ETB',
      charge: Number(chapaData.charge || 0),
      reference: chapaData.reference,
      rawResponse: data,
    };
  }

  /**
   * Verify Chapa Webhook HMAC-SHA256 signature
   * Ensures the incoming webhook authentically originated from Chapa.
   * Constant-time comparison prevents timing attacks.
   */
  public static verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) {
      return false;
    }

    const secret = walletConfig.chapaWebhookSecret || walletConfig.chapaSecretKey;
    if (!secret) {
      console.error('[CHAPA WEBHOOK SECURITY] Missing CHAPA_WEBHOOK_SECRET or CHAPA_SECRET_KEY.');
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const computedSignature = hmac.digest('hex');

      // Use timingSafeEqual to avoid timing attacks
      const computedBuf = Buffer.from(computedSignature, 'utf8');
      const headerBuf = Buffer.from(signatureHeader.trim(), 'utf8');

      if (computedBuf.length !== headerBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(computedBuf, headerBuf);
    } catch (err) {
      console.error('[CHAPA WEBHOOK SIGNATURE ERROR]', err);
      return false;
    }
  }

  /**
   * Fetch list of supported banks from Chapa
   * GET /v1/banks
   * Caches in-memory with TTL and synchronizes with CachedBank database table.
   */
  public static async getBanks(): Promise<ChapaBank[]> {
    const now = Date.now();

    // Check in-memory cache
    if (this.cachedBanks.length > 0 && now < this.bankCacheExpiresAt) {
      return this.cachedBanks;
    }

    // Check database cache first
    try {
      const dbBanks = await prisma.cachedBank.findMany({
        orderBy: { name: 'asc' },
      });
      if (dbBanks.length > 0) {
        const oldestUpdate = Math.min(...dbBanks.map((b) => new Date(b.updatedAt).getTime()));
        if (now - oldestUpdate < this.BANK_CACHE_TTL_MS) {
          this.cachedBanks = dbBanks.map((b) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            acronym: b.acronym || undefined,
          }));
          this.bankCacheExpiresAt = now + 60 * 60 * 1000; // 1 hr in-memory
          return this.cachedBanks;
        }
      }
    } catch (dbErr) {
      console.warn('[CHAPA BANKS] DB cache query notice:', dbErr);
    }

    // Default Ethiopian Banks fallback in case network call fails or in dev/mock mode
    const fallbackBanks: ChapaBank[] = [
      { id: 'cbe', code: '855', name: 'Commercial Bank of Ethiopia (CBE)', acronym: 'CBE' },
      { id: 'telebirr', code: 'telebirr', name: 'Telebirr', acronym: 'Telebirr' },
      { id: 'awash', code: '856', name: 'Awash Bank', acronym: 'AWASH' },
      { id: 'abyssinia', code: '857', name: 'Bank of Abyssinia', acronym: 'BOA' },
      { id: 'dashen', code: '858', name: 'Dashen Bank', acronym: 'DASHEN' },
      { id: 'oromia', code: '859', name: 'Cooperative Bank of Oromia', acronym: 'COOP' },
      { id: 'wegagen', code: '860', name: 'Wegagen Bank', acronym: 'WEGAGEN' },
      { id: 'hibret', code: '861', name: 'Hibret Bank', acronym: 'HIBRET' },
      { id: 'nib', code: '862', name: 'Nib International Bank', acronym: 'NIB' },
      { id: 'zemen', code: '863', name: 'Zemen Bank', acronym: 'ZEMEN' },
    ];

    if (!walletConfig.chapaSecretKey || walletConfig.chapaSecretKey.startsWith('mock_')) {
      this.cachedBanks = fallbackBanks;
      this.bankCacheExpiresAt = now + this.BANK_CACHE_TTL_MS;
      return fallbackBanks;
    }

    try {
      const data = await this.request<any>('/banks', { method: 'GET' });
      const rawBankList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];

      if (rawBankList.length > 0) {
        const banks: ChapaBank[] = rawBankList.map((item: any) => ({
          id: String(item.id || item.code || item.slug),
          code: String(item.code || item.id),
          name: String(item.name),
          acronym: item.acronym || item.short_name || null,
        }));

        this.cachedBanks = banks;
        this.bankCacheExpiresAt = now + this.BANK_CACHE_TTL_MS;

        // Upsert into DB cache asynchronously
        Promise.all(
          banks.map((b) =>
            prisma.cachedBank.upsert({
              where: { code: b.code },
              update: { name: b.name, acronym: b.acronym, updatedAt: new Date() },
              create: { id: b.id, code: b.code, name: b.name, acronym: b.acronym },
            })
          )
        ).catch((syncErr) => console.warn('[CHAPA BANKS SYNC WARN]', syncErr));

        return banks;
      }
    } catch (err: any) {
      console.warn('[CHAPA BANKS FETCH WARN] Could not fetch live banks, using verified Ethiopian banks list:', err.message);
    }

    this.cachedBanks = fallbackBanks;
    this.bankCacheExpiresAt = now + 10 * 60 * 1000; // 10 min retry
    return fallbackBanks;
  }

  /**
   * Initiate a fund transfer / payout to a salesperson's bank account
   * POST /v1/transfers
   */
  public static async initiateTransfer(params: ChapaTransferParams): Promise<ChapaTransferResponse> {
    const amountEtb = centsToEtb(params.amountCents);

    const bodyPayload = {
      account_number: params.accountNumber,
      account_name: params.accountName,
      amount: amountEtb.toFixed(2),
      currency: params.currency || 'ETB',
      bank_code: params.bankCode,
      reference: params.reference,
    };

    if (!walletConfig.chapaSecretKey || walletConfig.chapaSecretKey.startsWith('mock_')) {
      console.warn('[CHAPA SANDBOX MOCK] Mock transfer initiated for reference:', params.reference);
      return {
        status: 'success',
        reference: params.reference,
        transferId: `chapa_tr_${Date.now()}`,
        rawResponse: { message: 'Mock transfer successful', status: 'success' },
      };
    }

    const data = await this.request<any>('/transfers', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });

    const isSuccess = data.status === 'success' || data.message?.toLowerCase().includes('success');
    const transferId = data.data?.id || data.data?.transfer_id || data.transfer_id;

    return {
      status: isSuccess ? 'success' : (data.status || 'pending'),
      reference: params.reference,
      transferId,
      rawResponse: data,
    };
  }

  /**
   * Verify status of a payout transfer
   * GET /v1/transfers/verify/{reference}
   */
  public static async verifyTransfer(reference: string): Promise<{ status: 'success' | 'failed' | 'pending'; rawResponse: any }> {
    if (!walletConfig.chapaSecretKey || walletConfig.chapaSecretKey.startsWith('mock_')) {
      console.warn('[CHAPA SANDBOX MOCK] Mock transfer verified for:', reference);
      return { status: 'success', rawResponse: { status: 'success', reference } };
    }

    const data = await this.request<any>(`/transfers/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
    });

    const isSuccess = data.status === 'success' || data.data?.status === 'success';
    const isFailed = data.status === 'failed' || data.data?.status === 'failed';

    return {
      status: isSuccess ? 'success' : isFailed ? 'failed' : 'pending',
      rawResponse: data,
    };
  }

  /**
   * Get Chapa merchant balance for daily reconciliation
   * GET /v1/balances
   */
  public static async getBalance(): Promise<ChapaBalanceResponse> {
    if (!walletConfig.chapaSecretKey || walletConfig.chapaSecretKey.startsWith('mock_')) {
      return {
        currency: 'ETB',
        balanceCents: etbToCents(100000), // Mock 100k ETB
        rawResponse: { status: 'success', mock: true, balance: 100000 },
      };
    }

    const data = await this.request<any>('/balances', { method: 'GET' });
    const balanceData = data.data?.[0] || data.data || data;
    const balanceAmount = Number(balanceData.balance || balanceData.available_balance || 0);

    return {
      currency: balanceData.currency || 'ETB',
      balanceCents: etbToCents(balanceAmount),
      rawResponse: data,
    };
  }
}
