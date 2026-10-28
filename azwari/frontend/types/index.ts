export type Role = 'public' | 'supplier' | 'salesperson' | 'admin' | 'customer';

export type AppView = 'marketplace' | 'signin' | 'signup' | 'portal' | 'track_order';

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: 'salesperson' | 'supplier' | 'admin';
  salespersonId?: string; // Links to SalesPartnerProfile
  supplierId?: string; // Links to Business
  subcity?: string;
  avatarUrl?: string;
  createdAt: string;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type PaymentMethodProvider = 'Telebirr' | 'Commercial Bank of Ethiopia (CBE)' | 'Awash Bank' | 'Bank of Abyssinia' | 'Dashen Bank';

export interface SupplierPaymentAccount {
  id: string;
  provider: PaymentMethodProvider;
  accountNumber: string;
  accountHolderName: string;
  isPrimary: boolean;
  verified: boolean;
  instructions?: string;
}

export interface Business {
  id: string;
  name: string;
  tradeName: string;
  tinNumber: string;
  licenseNumber: string;
  verificationStatus: VerificationStatus;
  verificationDocumentUrl?: string;
  city: string;
  subcity: string;
  specificLocation: string;
  phone: string;
  contactEmail: string;
  paymentAccounts: SupplierPaymentAccount[];
  commissionReserveBalance: number; // ETB
  subscriptionPlan: 'starter_pilot' | 'business_growth' | 'enterprise_scale';
  subscriptionStatus: 'active' | 'trial' | 'past_due';
  subscriptionRenewalDate: string;
  createdAt: string;
}

export interface SalesPartnerProfile {
  id: string;
  fullName: string;
  phone: string;
  telegramUsername?: string;
  idNumber: string;
  verificationStatus: VerificationStatus;
  city: string;
  subcity: string;
  payoutDestination: {
    provider: 'Telebirr' | 'CBE';
    accountNumber: string;
    accountHolderName: string;
  };
  totalAttributedSales: number; // ETB
  pendingCommissions: number; // ETB
  eligibleCommissions: number; // ETB
  paidCommissions: number; // ETB
  enrolledProductIds: string[];
  referralCode: string;
  joinedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  additionalPrice: number; // ETB
  stock: number;
}

export interface CommissionTerm {
  id: string;
  productId: string;
  type: 'fixed_per_unit' | 'percentage';
  rateOrAmount: number; // e.g. 15 for 15% or 350 for ETB 350
  calculationBasis: 'subtotal_excluding_delivery' | 'order_total';
  eligibilityConditions: string;
  returnPeriodDays: number;
  settlementDeadlineHours: number;
  version: number;
  isActive: boolean;
  effectiveFrom: string;
}

export interface Product {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  sku: string;
  category: 'Fashion & Leather' | 'Coffee & Agro' | 'Beauty & Health' | 'Electronics & Home' | 'Artisan Crafts';
  description: string;
  unitPrice: number; // ETB
  suggestedRetailPrice?: number; // ETB
  costPrice: number; // ETB
  stock: number;
  minimumOrderQty: number;
  variants: ProductVariant[];
  deliveryAreas: string[]; // Addis Ababa subcities
  standardDeliveryFee: number; // ETB
  estimatedFulfillmentHours: number;
  fulfillmentType: 'physical' | 'service';
  status: 'active' | 'draft' | 'out_of_stock';
  isActive?: boolean;
  commissionTerms: CommissionTerm;
  badgeLabel?: string;
  imageUrl?: string;
  images?: string[];
  createdAt: string;
}

export type OrderStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'payment_review'
  | 'payment_verified'
  | 'confirmed'
  | 'preparing'
  | 'scheduled'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type PaymentAttemptStatus = 'pending' | 'submitted' | 'verified' | 'rejected' | 'expired';

export interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number; // ETB
  lineSubtotal: number; // ETB
}

export interface OrderConsent {
  obtained: boolean;
  method: 'phone_call' | 'telegram_chat' | 'in_person_verbal';
  timestamp: string;
  recordedBySalespersonId: string;
}

export interface PaymentEvidence {
  id: string;
  orderId: string;
  attemptId: string;
  provider: PaymentMethodProvider;
  transactionReference: string;
  amountShown: number; // ETB
  submittedAt: string;
  receiptNote?: string;
  receiptMockImage?: string;
  verifierStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface DeliveryDetails {
  recipientName: string;
  recipientPhone: string;
  subcity: string;
  specificAddress: string;
  preferredDate: string;
  preferredTimeSlot: string;
  specialInstructions?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  scheduledAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  proofNotes?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. ORD-AA-2026-1048
  publicAccessToken: string; // high-entropy secure token for customer SMS link
  supplierId: string;
  supplierName: string;
  salespersonId: string;
  salespersonName: string;
  salespersonPhone: string;
  buyerName: string;
  buyerPhone: string;
  items: OrderItem[];
  subtotal: number; // ETB
  deliveryFee: number; // ETB
  discount: number; // ETB
  totalAmount: number; // ETB
  agreedCommissionAmount: number; // ETB
  platformFeeAmount: number; // ETB
  supplierNetPayout: number; // ETB
  commissionTermsSnapshot: {
    type: 'fixed_per_unit' | 'percentage';
    rateOrAmount: number;
    calculationBasis: string;
    version: number;
  };
  orderStatus: OrderStatus;
  paymentStatus: PaymentAttemptStatus;
  paymentExpiresAt: string; // ISO
  selectedPaymentAccount: SupplierPaymentAccount;
  delivery: DeliveryDetails;
  consent: OrderConsent;
  evidence?: PaymentEvidence;
  disputeId?: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type CommissionLedgerStatus =
  | 'estimated'
  | 'pending'
  | 'eligible'
  | 'reserved_for_payout'
  | 'paid'
  | 'disputed'
  | 'reversed';

export interface CommissionLedgerEntry {
  id: string;
  orderId: string;
  orderNumber: string;
  salespersonId: string;
  salespersonName: string;
  supplierId: string;
  supplierName: string;
  amount: number; // ETB
  calculationNote: string;
  status: CommissionLedgerStatus;
  orderDeliveredAt?: string;
  eligibleAt?: string;
  paidAt?: string;
  settlementBatchId?: string;
  payoutReference?: string;
  createdAt: string;
}

export interface PlatformFeeLedgerEntry {
  id: string;
  orderId: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  amount: number; // ETB
  rate: number; // e.g. 0.02 (2%)
  status: 'accrued' | 'secured' | 'paid';
  createdAt: string;
}

export interface SettlementBatch {
  id: string;
  batchNumber: string; // e.g. SETTLE-2026-042
  recipientType: 'salesperson' | 'platform';
  recipientId: string;
  recipientName: string;
  totalAmount: number; // ETB
  commissionLedgerIds: string[];
  payoutMethod: 'Telebirr B2C' | 'CBE Direct Transfer' | 'Awash Bank Transfer';
  destinationAccount: string;
  transactionReference: string;
  status: 'processing' | 'settled' | 'failed';
  settledAt: string;
  createdByName: string;
}

export interface Dispute {
  id: string;
  disputeNumber: string; // e.g. DISP-2026-018
  orderId: string;
  orderNumber: string;
  raisedByRole: 'salesperson' | 'supplier' | 'customer';
  raisedByName: string;
  category: 'unverified_payment' | 'delayed_delivery' | 'wrong_item' | 'commission_discrepancy' | 'supplier_unresponsive';
  reason: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolutionDecision?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedByAdmin?: string;
  createdAt: string;
}

export interface SmsMessage {
  id: string;
  recipientPhone: string;
  templateName: string;
  orderNumber: string;
  messageBody: string;
  provider: 'SMS Ethiopia Gateway' | 'Ethio Telecom SMS Gateway' | 'Safaricom Ethiopia Gateway' | string;
  status: 'queued' | 'submitted' | 'delivered' | 'failed';
  attempts: number;
  sentAt: string;
  providerRef: string;
  isSimulated?: boolean;
  error?: string;
}

export interface WaitlistEntry {
  id: string;
  fullName: string;
  phone: string;
  role: 'sales_agent' | 'supplier';
  subcity: string;
  telegramUsername?: string;
  categoryOrChannel: string;
  estimatedScale: string;
  referralCode: string;
  referralCount: number;
  waitlistNumber: number;
  status: 'waitlisted' | 'invited' | 'onboarded';
  joinedAt: string;
  invitedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorRole: Role;
  actorName: string;
  action: string;
  entityType: 'order' | 'payment' | 'commission' | 'delivery' | 'dispute' | 'supplier' | 'salesperson' | 'admin';
  entityId: string;
  description: string;
}

export interface WalletBalances {
  availableCents: string;
  lockedCents: string;
  totalCents: string;
  availableEtb: number;
  lockedEtb: number;
  totalEtb: number;
  currency: string;
}

export interface WalletTransactionItem {
  id: string;
  type: string;
  amountCents: string;
  amountEtb: number;
  ref: string;
  status: string;
  balanceAfterAvailableEtb: number;
  balanceAfterLockedEtb: number;
  metadata?: any;
  createdAt: string;
}

export interface WalletDetails {
  walletId: string;
  ownerType: 'MERCHANT' | 'SALESPERSON';
  balances: WalletBalances;
  transactions: WalletTransactionItem[];
}

export interface SupportedBank {
  id: string;
  code: string;
  name: string;
  acronym?: string;
}

export interface DepositInitResponse {
  success: boolean;
  tx_ref: string;
  checkout_url: string;
  amount: number;
  currency: string;
}

export interface PayoutResponse {
  success: boolean;
  reference: string;
  status: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  message: string;
}

export type NotificationType = 
  | 'order'
  | 'inventory'
  | 'wallet'
  | 'dispute'
  | 'escrow'
  | 'system';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'urgent';

export interface AppNotification {
  id: string;
  recipientRole: 'salesperson' | 'supplier' | 'admin' | 'all';
  recipientId?: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    orderId?: string;
    orderNumber?: string;
    productId?: string;
    productName?: string;
    stockRemaining?: number;
    amount?: number;
    disputeId?: string;
  };
}


