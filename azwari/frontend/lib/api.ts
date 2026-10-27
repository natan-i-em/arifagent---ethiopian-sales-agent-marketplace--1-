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
} from '../types';

const API_BASE = (
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:5000/api')
).replace(/\/$/, '');

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

  // Auto-attach Supabase Bearer token
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('[API Client] Could not resolve Supabase session:', err);
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
    apiRequest<{ success: boolean; user: any; business?: Business; salesPartner?: SalesPartnerProfile; error?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
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
  settle: async (data: { salespersonId: string; payoutMethod: string; transactionReference: string; entryIds?: string[] }) =>
    apiRequest<{ success: boolean; batch: SettlementBatch }>('/commissions/settle', {
      method: 'POST',
      body: JSON.stringify(data),
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
