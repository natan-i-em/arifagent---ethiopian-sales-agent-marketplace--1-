'use client';

import React, { createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { CatalogProvider, useCatalog } from './CatalogContext';
import { OrdersProvider, useOrders } from './OrdersContext';
import { FinanceProvider, useFinance } from './FinanceContext';
import { WaitlistProvider, useWaitlist } from './WaitlistContext';
import { NotificationProvider, useNotifications } from './NotificationContext';
import {
  Role,
  AppView,
  AuthUser,
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
  VerificationStatus,
  PaymentMethodProvider,
  SupplierPaymentAccount,
  WaitlistEntry,
  AppNotification,
  NotificationType,
  NotificationSeverity,
} from '../types';

export interface AppContextType {
  currentUser: AuthUser | null;
  isAuthLoading: boolean;
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  selectedSalespersonId: string;
  setSelectedSalespersonId: (id: string) => void;
  selectedCustomerToken: string;
  setSelectedCustomerToken: (token: string) => void;

  businesses: Business[];
  salesPartners: SalesPartnerProfile[];
  products: Product[];
  orders: Order[];
  commissionLedger: CommissionLedgerEntry[];
  platformFeeLedger: PlatformFeeLedgerEntry[];
  settlementBatches: SettlementBatch[];
  disputes: Dispute[];
  smsOutbox: SmsMessage[];
  auditLogs: AuditLog[];
  waitlist: WaitlistEntry[];
  showWaitlistModal: boolean;
  setShowWaitlistModal: (open: boolean) => void;
  waitlistRolePreference: 'sales_agent' | 'supplier';
  setWaitlistRolePreference: (role: 'sales_agent' | 'supplier') => void;
  recentSmsAlert: SmsMessage | null;
  dismissSmsAlert: () => void;

  // Real-time Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  sendNotification: (input: {
    recipientRole: 'salesperson' | 'supplier' | 'admin' | 'all';
    recipientId?: string;
    type: NotificationType;
    title: string;
    message: string;
    severity: NotificationSeverity;
    link?: string;
    metadata?: AppNotification['metadata'];
  }) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // Actions
  joinWaitlist: (data: {
    fullName: string;
    phone: string;
    role: 'sales_agent' | 'supplier';
    subcity: string;
    telegramUsername?: string;
    categoryOrChannel: string;
    estimatedScale: string;
    referralCodeUsed?: string;
  }) => { success: boolean; entry: WaitlistEntry };
  inviteWaitlistEntry: (id: string) => boolean;

  createOrder: (orderData: {
    productId: string;
    variantId?: string;
    quantity: number;
    buyerName: string;
    buyerPhone: string;
    deliverySubcity: string;
    specificAddress: string;
    preferredDate: string;
    preferredTimeSlot: string;
    specialInstructions?: string;
    paymentAccountId: string;
    consentMethod: 'phone_call' | 'telegram_chat' | 'in_person_verbal';
  }) => Promise<{ success: boolean; order?: Order; error?: string }>;

  submitPaymentEvidence: (
    orderId: string,
    evidence: {
      provider: PaymentMethodProvider;
      transactionReference: string;
      amountShown: number;
      receiptNote?: string;
      receiptMockImage?: string;
    }
  ) => boolean;

  verifyPayment: (orderId: string, approved: boolean, reason?: string) => boolean;
  scheduleDelivery: (
    orderId: string,
    details: {
      assignedDriverName: string;
      assignedDriverPhone: string;
      scheduledDate: string;
      scheduledTimeSlot: string;
      notes?: string;
    }
  ) => boolean;
  dispatchOrder: (orderId: string) => boolean;
  markOrderDelivered: (orderId: string, proofNotes?: string) => boolean;
  extendPaymentWindow: (orderId: string) => boolean;
  cancelOrder: (orderId: string, reason: string) => boolean;

  createProduct: (product: Partial<Product>) => boolean;
  updateProduct: (productId: string, updates: Partial<Product>) => boolean;
  deleteProduct: (productId: string, permanent?: boolean) => boolean;
  updateBusinessProfile: (businessId: string, updates: Partial<Business>) => Promise<boolean>;
  addPaymentAccount: (businessId: string, accountData: Omit<SupplierPaymentAccount, 'id' | 'verified'>) => Promise<boolean>;
  deletePaymentAccount: (businessId: string, accountId: string) => Promise<boolean>;
  enrollSalesperson: (salespersonId: string, productId: string) => boolean;
  settleCommissions: (
    salespersonId: string,
    commissionEntryIds: string[],
    payoutMethod: 'Telebirr B2C' | 'CBE Direct Transfer' | 'Awash Bank Transfer',
    transactionReference: string
  ) => boolean;
  createDispute: (
    orderId: string,
    category: Dispute['category'],
    reason: string,
    raisedByRole: 'salesperson' | 'supplier' | 'customer',
    raisedByName: string
  ) => boolean;
  resolveDispute: (disputeId: string, decision: string, note: string) => boolean;
  verifyBusiness: (businessId: string, status: VerificationStatus) => boolean;
  registerSupplier: (supplierData: {
    name: string;
    tradeName: string;
    tinNumber: string;
    licenseNumber: string;
    subcity: string;
    specificLocation: string;
    phone: string;
    contactEmail: string;
    primaryBank: {
      provider: PaymentMethodProvider;
      accountNumber: string;
      accountHolderName: string;
    };
    password?: string;
  }) => Promise<{ success: boolean; business?: Business; error?: string }>;
  registerSalesAgent: (agentData: {
    fullName: string;
    phone: string;
    email?: string;
    password?: string;
    subcity: string;
    telegramUsername?: string;
    payoutProvider: 'Telebirr' | 'CBE';
    payoutAccountNumber: string;
    payoutAccountName: string;
  }) => Promise<{ success: boolean; agent?: SalesPartnerProfile; error?: string }>;

  // Auth & RBAC
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  permissionError: string | null;
  dismissPermissionError: () => void;
  authRolePreference: 'salesperson' | 'supplier' | 'admin';
  setAuthRolePreference: (role: 'salesperson' | 'supplier' | 'admin') => void;
  login: (credentials: {
    emailOrPhone: string;
    password?: string;
    role?: 'salesperson' | 'supplier' | 'admin';
    entityId?: string;
  }) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  signInWithGoogle: (rolePreference?: 'salesperson' | 'supplier') => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  resetToDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppFacadeBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const catalog = useCatalog();
  const orders = useOrders();
  const finance = useFinance();
  const waitlist = useWaitlist();
  const notifs = useNotifications();

  const resetToDemoData = () => {
    window.location.reload();
  };

  const facadeValue: AppContextType = {
    // Auth
    currentUser: auth.currentUser,
    isAuthLoading: auth.isAuthLoading,
    activeRole: auth.activeRole,
    setActiveRole: auth.setActiveRole,
    currentView: auth.currentView,
    setCurrentView: auth.setCurrentView,
    permissionError: auth.permissionError,
    dismissPermissionError: auth.dismissPermissionError,
    authRolePreference: auth.authRolePreference,
    setAuthRolePreference: auth.setAuthRolePreference,
    selectedSupplierId: auth.selectedSupplierId,
    setSelectedSupplierId: auth.setSelectedSupplierId,
    selectedSalespersonId: auth.selectedSalespersonId,
    setSelectedSalespersonId: auth.setSelectedSalespersonId,
    selectedCustomerToken: auth.selectedCustomerToken,
    setSelectedCustomerToken: auth.setSelectedCustomerToken,
    login: auth.login,
    signInWithGoogle: auth.signInWithGoogle,
    logout: auth.logout,
    registerSupplier: auth.registerSupplier,
    registerSalesAgent: auth.registerSalesAgent,

    // Catalog & Merchants
    products: catalog.products,
    businesses: catalog.businesses,
    salesPartners: catalog.salesPartners,
    createProduct: catalog.createProduct,
    updateProduct: catalog.updateProduct,
    deleteProduct: catalog.deleteProduct,
    enrollSalesperson: catalog.enrollSalesperson,
    updateBusinessProfile: catalog.updateBusinessProfile,
    verifyBusiness: catalog.verifyBusiness,
    addPaymentAccount: catalog.addPaymentAccount,
    deletePaymentAccount: catalog.deletePaymentAccount,

    // Orders
    orders: orders.orders,
    createOrder: orders.createOrder,
    submitPaymentEvidence: orders.submitPaymentEvidence,
    verifyPayment: orders.verifyPayment,
    scheduleDelivery: orders.scheduleDelivery,
    dispatchOrder: orders.dispatchOrder,
    markOrderDelivered: orders.markOrderDelivered,
    extendPaymentWindow: orders.extendPaymentWindow,
    cancelOrder: orders.cancelOrder,

    // Finance & Compliance
    commissionLedger: finance.commissionLedger,
    platformFeeLedger: finance.platformFeeLedger,
    settlementBatches: finance.settlementBatches,
    disputes: finance.disputes,
    auditLogs: finance.auditLogs,
    smsOutbox: finance.smsOutbox,
    settleCommissions: finance.settleCommissions,
    createDispute: finance.createDispute,
    resolveDispute: finance.resolveDispute,

    // Notifications
    notifications: notifs.notifications,
    unreadNotificationsCount: notifs.unreadCount,
    sendNotification: notifs.sendNotification,
    markNotificationAsRead: notifs.markAsRead,
    markAllNotificationsAsRead: notifs.markAllAsRead,

    // Waitlist
    waitlist: waitlist.waitlist,
    showWaitlistModal: waitlist.showWaitlistModal,
    setShowWaitlistModal: waitlist.setShowWaitlistModal,
    waitlistRolePreference: waitlist.waitlistRolePreference,
    setWaitlistRolePreference: waitlist.setWaitlistRolePreference,
    recentSmsAlert: waitlist.recentSmsAlert,
    dismissSmsAlert: waitlist.dismissSmsAlert,
    joinWaitlist: waitlist.joinWaitlist,
    inviteWaitlistEntry: waitlist.inviteWaitlistEntry,

    resetToDemoData,
  };

  return <AppContext.Provider value={facadeValue}>{children}</AppContext.Provider>;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <CatalogProvider>
        <OrdersProvider>
          <FinanceProvider>
            <WaitlistProvider>
              <NotificationProvider>
                <AppFacadeBridge>{children}</AppFacadeBridge>
              </NotificationProvider>
            </WaitlistProvider>
          </FinanceProvider>
        </OrdersProvider>
      </CatalogProvider>
    </AuthProvider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
