import { supabase } from './supabase';
import {
  Business,
  SalesPartnerProfile,
  Product,
  Order,
  CommissionLedgerEntry,
  PlatformFeeLedgerEntry,
  SettlementBatch,
  Dispute,
  SmsMessage,
  AuditLog,
  WaitlistEntry,
  SupplierPaymentAccount,
  WalletDetails,
  SupportedBank,
  DepositInitResponse,
  PayoutResponse,
  PlatformFeesSummaryResponse,
  FunnelsAnalyticsResponse,
} from '../types';

export const getApiBase = () => {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const backend = (typeof process !== 'undefined' && process.env?.BACKEND_URL) || 'https://azwari.onrender.com';
  return `${backend.replace(/\/$/, '')}/api`;
};

export const API_BASE = getApiBase().replace(/\/$/, '');

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  [key: string]: any;
}

/**
 * Low-level API request wrapper that auto-attaches verified Supabase JWT Bearer token
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { idempotencyKey?: string; trackingToken?: string } = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Auto-attach Supabase or verified Azwari Bearer token
  let token: string | undefined;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData?.session?.access_token;
  } catch (err) {
    console.warn('[API Client] Could not resolve Supabase session:', err);
  }

  // Fallback to persisted session token in sessionStorage or localStorage
  if (!token && typeof window !== 'undefined') {
    try {
      token =
        window.sessionStorage.getItem('azwari_auth_token') ||
        window.localStorage.getItem('azwari_auth_token') ||
        undefined;
    } catch {}
  }

  // Auto-heal: If token is missing but an active user session exists in storage, dynamically retrieve session token
  if (!token && typeof window !== 'undefined' && !cleanEndpoint.startsWith('/auth/')) {
    try {
      const savedUserStr =
        window.sessionStorage.getItem('azwari_auth_session') ||
        window.localStorage.getItem('azwari_auth_session');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser?.email || savedUser?.id) {
          const sessionRes = await fetch(`${API_BASE}/auth/session-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedUser.email, userId: savedUser.id }),
          });
          if (sessionRes.ok) {
            const data = await sessionRes.json();
            if (data?.token) {
              token = data.token;
              window.sessionStorage.setItem('azwari_auth_token', data.token);
              window.localStorage.setItem('azwari_auth_token', data.token);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[API Client] Auto-heal session notice:', err);
    }
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  // Idempotency key header
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  // Tracking token header
  if (options.trackingToken) {
    headers['x-tracking-token'] = options.trackingToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let responseData: any = {};
  if (contentType.includes('application/json')) {
    responseData = await response.json().catch(() => ({}));
  } else {
    responseData = { text: await response.text() };
  }

  if (!response.ok) {
    const message =
      responseData?.error ||
      responseData?.message ||
      (responseData?.details ? JSON.stringify(responseData.details) : `Server HTTP ${response.status}`);
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).details = responseData?.details;
    throw error;
  }

  return responseData as T;
}

// -------------------------------------------------------------
// Typed API Services
// -------------------------------------------------------------

export const authApi = {
  getMe: async () =>
    apiRequest<{ success: boolean; user: any; business?: Business; salesPartner?: SalesPartnerProfile; error?: string }>('/auth/me'),
  login: async (credentials: { emailOrPhone: string; password?: string; role?: string }) =>
    apiRequest<{
      success: boolean;
      token?: string;
      sessionToken?: string;
      session?: any;
      user: any;
      business?: Business;
      salesPartner?: SalesPartnerProfile;
      error?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getSessionToken: async (params: { email?: string; userId?: string; phone?: string }) =>
    apiRequest<{
      success: boolean;
      token: string;
      sessionToken: string;
      user: any;
      business?: Business;
      salesPartner?: SalesPartnerProfile;
      error?: string;
    }>('/auth/session-token', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  registerSupplier: async (data: any) =>
    apiRequest<{ success: boolean; user: any; business: Business; message?: string; error?: string }>('/auth/register-supplier', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  registerSalesAgent: async (data: any) =>
    apiRequest<{ success: boolean; user: any; salesPartner: SalesPartnerProfile; message?: string; error?: string }>('/auth/register-agent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  syncUser: async (data: any) =>
    apiRequest<{ success: boolean; user: any; business?: Business; salesPartner?: SalesPartnerProfile; error?: string }>('/auth/sync-user', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const productsApi = {
  getAll: async (params?: { activeOnly?: boolean; supplierId?: string }) => {
    const query = new URLSearchParams();
    if (params?.activeOnly) query.append('activeOnly', 'true');
    if (params?.supplierId) query.append('supplierId', params.supplierId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<{ success: boolean; count: number; products: Product[] }>(`/products${qs}`);
  },
  getById: async (id: string) => apiRequest<{ success: boolean; product: Product }>(`/products/${id}`),
  create: async (data: any) =>
    apiRequest<{ success: boolean; product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: async (id: string, data: any) =>
    apiRequest<{ success: boolean; product: Product }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: async (id: string, permanent = false) =>
    apiRequest<{ success: boolean; message: string }>(`/products/${id}?permanent=${permanent}`, {
      method: 'DELETE',
    }),
  enroll: async (id: string) =>
    apiRequest<{ success: boolean; enrolledProductIds: string[]; message: string }>(`/products/${id}/enroll`, {
      method: 'POST',
    }),
};

export const ordersApi = {
  getAll: async () => apiRequest<{ success: boolean; count: number; orders: Order[] }>('/orders'),
  getById: async (id: string) => apiRequest<{ success: boolean; order: Order }>(`/orders/${id}`),
  getByToken: async (token: string) => apiRequest<{ success: boolean; order: Order }>(`/orders/public/${token}`),
  create: async (data: any, idempotencyKey?: string) =>
    apiRequest<{ success: boolean; order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey,
    }),
  submitEvidence: async (id: string, data: any, trackingToken?: string) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/${id}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data),
      trackingToken,
    }),
  verifyPayment: async (id: string, approved: boolean, rejectionReason?: string) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/${id}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ approved, rejectionReason }),
    }),
  scheduleDelivery: async (id: string, details: any) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify(details),
    }),
  dispatch: async (id: string, notes?: string) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  deliver: async (id: string, proofNotes?: string) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/${id}/deliver`, {
      method: 'POST',
      body: JSON.stringify({ proofNotes }),
    }),
  extendPayment: async (id: string, additionalMinutes = 15, trackingToken?: string) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/${id}/extend-payment`, {
      method: 'POST',
      body: JSON.stringify({ additionalMinutes }),
      trackingToken,
    }),
  cancel: async (id: string, reason: string) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  chapaCheckout: async (token: string) =>
    apiRequest<{ success: boolean; checkoutUrl: string; txRef: string }>(`/orders/public/${token}/chapa-checkout`, {
      method: 'POST',
    }),
  verifyChapaPayment: async (token: string, tx_ref?: string) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/public/${token}/verify-chapa`, {
      method: 'POST',
      body: JSON.stringify({ tx_ref }),
    }),
  confirmCustomerDelivery: async (token: string, notes?: string) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/public/${token}/confirm-delivery`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  submitEvidenceByToken: async (token: string, data: any) =>
    apiRequest<{ success: boolean; order: Order }>(`/orders/public/${token}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadReceiptImage: async (fileData: string, fileName?: string, orderNumber?: string) =>
    apiRequest<{ success: boolean; imageUrl: string }>(`/upload/receipt-image`, {
      method: 'POST',
      body: JSON.stringify({ fileData, fileName, orderNumber }),
    }),
};

export const businessesApi = {
  getAll: async () => apiRequest<{ success: boolean; count: number; businesses: Business[] }>('/businesses'),
  getById: async (id: string) => apiRequest<{ success: boolean; business: Business }>(`/businesses/${id}`),
  update: async (id: string, updates: any) =>
    apiRequest<{ success: boolean; business: Business }>(`/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  verify: async (id: string, status: string) =>
    apiRequest<{ success: boolean; business: Business }>(`/businesses/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  addPaymentAccount: async (id: string, accountData: any) =>
    apiRequest<{ success: boolean; account: SupplierPaymentAccount }>(`/businesses/${id}/payment-accounts`, {
      method: 'POST',
      body: JSON.stringify(accountData),
    }),
  deletePaymentAccount: async (id: string, accountId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/businesses/${id}/payment-accounts/${accountId}`, {
      method: 'DELETE',
    }),
};

export const salesPartnersApi = {
  getAll: async () => apiRequest<{ success: boolean; count: number; salesPartners: SalesPartnerProfile[] }>('/sales-partners'),
  getById: async (id: string) => apiRequest<{ success: boolean; salesPartner: SalesPartnerProfile }>(`/sales-partners/${id}`),
  update: async (id: string, updates: any) =>
    apiRequest<{ success: boolean; salesPartner: SalesPartnerProfile }>(`/sales-partners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
};

export const commissionsApi = {
  getAll: async () => apiRequest<{ success: boolean; count: number; commissions: CommissionLedgerEntry[] }>('/commissions'),
  getBatches: async () => apiRequest<{ success: boolean; count: number; batches: SettlementBatch[] }>('/commissions/batches'),
  settle: async (data: {
    salespersonId: string;
    payoutMethod: string;
    transactionReference: string;
    entryIds?: string[];
    receiptImageUrl?: string;
  }) =>
    apiRequest<{ success: boolean; batch: SettlementBatch }>('/commissions/settle', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  settlePlatformFee: async (data: {
    payoutMethod: string;
    transactionReference: string;
    receiptImageUrl?: string;
    amount?: number;
  }) =>
    apiRequest<{ success: boolean; message: string; batch?: any }>('/commissions/settle-platform-fee', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPlatformFeesSummary: async () =>
    apiRequest<PlatformFeesSummaryResponse>('/commissions/platform-fees-summary'),
  markSupplierFeePaid: async (businessId: string, amount?: number, transactionReference?: string) =>
    apiRequest<{ success: boolean; message: string }>('/commissions/mark-supplier-fee-paid', {
      method: 'POST',
      body: JSON.stringify({ businessId, amount, transactionReference }),
    }),
  sendFeeReminder: async (businessId: string, amount?: number) =>
    apiRequest<{ success: boolean; message: string }>('/commissions/send-fee-reminder', {
      method: 'POST',
      body: JSON.stringify({ businessId, amount }),
    }),
};

export const analyticsApi = {
  track: async (data: {
    eventType: string;
    page?: string;
    device?: string;
    userId?: string;
    entityId?: string;
    metadata?: any;
  }) => {
    try {
      return await apiRequest<{ success: boolean }>('/analytics/track', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      return { success: false };
    }
  },
  getFunnels: async () => apiRequest<FunnelsAnalyticsResponse>('/analytics/funnels'),
  sendNudge: async (targetType: 'supplier' | 'agent', targetId: string, message?: string) =>
    apiRequest<{ success: boolean; message: string }>('/analytics/nudge', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, message }),
    }),
};

export const disputesApi = {
  getAll: async () => apiRequest<{ success: boolean; count: number; disputes: Dispute[] }>('/disputes'),
  create: async (data: { orderId: string; category: string; reason: string }) =>
    apiRequest<{ success: boolean; dispute: Dispute }>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolve: async (id: string, data: { resolutionDecision: string; resolutionNote: string }) =>
    apiRequest<{ success: boolean; dispute: Dispute }>(`/disputes/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export const waitlistApi = {
  getAll: async () => apiRequest<{ success: boolean; count: number; waitlist: WaitlistEntry[] }>('/waitlist'),
  join: async (data: any) =>
    apiRequest<{ success: boolean; entry: WaitlistEntry }>('/waitlist', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  invite: async (id: string) =>
    apiRequest<{ success: boolean; entry: WaitlistEntry }>(`/waitlist/${id}/invite`, {
      method: 'POST',
    }),
};

export const auditLogsApi = {
  getAll: async (limit = 100) => apiRequest<{ success: boolean; count: number; auditLogs: AuditLog[] }>(`/audit-logs?limit=${limit}`),
};

export const smsApi = {
  getOutbox: async () => apiRequest<{ success: boolean; count: number; outbox: SmsMessage[] }>('/sms/outbox'),
};

export const walletApi = {
  getDetails: async (params?: { businessId?: string; salesPartnerId?: string }) => {
    const query = new URLSearchParams();
    if (params?.businessId) query.set('businessId', params.businessId);
    if (params?.salesPartnerId) query.set('salesPartnerId', params.salesPartnerId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<{ success: boolean; wallet: WalletDetails }>(`/wallet${qs}`);
  },
  initiateDeposit: async (amount: number, businessId?: string) => {
    const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';
    return apiRequest<DepositInitResponse>(`/wallet/deposit${query}`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
  verifyDeposit: async (txRef: string) =>
    apiRequest<{
      success: boolean;
      tx_ref: string;
      status: 'pending' | 'success' | 'failed';
      amount: number;
      currency: string;
      verifiedAt: string | null;
      walletBalanceEtb: number;
    }>(`/wallet/deposit/verify/${encodeURIComponent(txRef)}`),
  getBanks: async () =>
    apiRequest<{ success: boolean; count: number; banks: SupportedBank[] }>('/wallet/banks'),
  requestWithdrawal: async (data: {
    amount: number;
    bank_code: string;
    account_number: string;
    account_name: string;
    salesPartnerId?: string;
  }) => {
    const query = data.salesPartnerId ? `?salesPartnerId=${encodeURIComponent(data.salesPartnerId)}` : '';
    return apiRequest<PayoutResponse>(`/wallet/withdraw${query}`, {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        bank_code: data.bank_code,
        account_number: data.account_number,
        account_name: data.account_name,
      }),
    });
  },
};
