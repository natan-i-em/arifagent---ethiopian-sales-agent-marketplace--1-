'use client';

import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../lib/api';
import { Order, PaymentMethodProvider } from '../types';

interface OrdersContextType {
  orders: Order[];
  isLoadingOrders: boolean;
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
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getAll(),
    refetchInterval: 1000 * 20, // 20s soft background sync
  });

  const orders = data?.orders || [];

  const invalidateOrdersAndFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['commissions'] });
    queryClient.invalidateQueries({ queryKey: ['salesPartners'] });
    queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
  };

  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => ordersApi.create(orderData),
    onSuccess: () => invalidateOrdersAndFinance(),
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: ({ orderId, evidence }: { orderId: string; evidence: any }) =>
      ordersApi.submitEvidence(orderId, evidence),
    onSuccess: () => invalidateOrdersAndFinance(),
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: ({ orderId, approved, reason }: { orderId: string; approved: boolean; reason?: string }) =>
      ordersApi.verifyPayment(orderId, approved, reason),
    onSuccess: () => invalidateOrdersAndFinance(),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ orderId, details }: { orderId: string; details: any }) =>
      ordersApi.scheduleDelivery(orderId, details),
    onSuccess: () => invalidateOrdersAndFinance(),
  });

  const dispatchMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.dispatch(orderId),
    onSuccess: () => invalidateOrdersAndFinance(),
  });

  const deliverMutation = useMutation({
    mutationFn: ({ orderId, proofNotes }: { orderId: string; proofNotes?: string }) =>
      ordersApi.deliver(orderId, proofNotes),
    onSuccess: () => invalidateOrdersAndFinance(),
  });

  const extendPaymentMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.extendPayment(orderId),
    onSuccess: () => invalidateOrdersAndFinance(),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      ordersApi.cancel(orderId, reason),
    onSuccess: () => invalidateOrdersAndFinance(),
  });

  const createOrder = async (orderData: any): Promise<{ success: boolean; order?: Order; error?: string }> => {
    // Generate idempotency key
    const idempotencyKey = 'idemp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    try {
      const res = await createOrderMutation.mutateAsync({ ...orderData, idempotencyKey });
      return { success: true, order: res.order };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const submitPaymentEvidence = (orderId: string, evidence: any): boolean => {
    submitEvidenceMutation.mutate({ orderId, evidence });
    return true;
  };

  const verifyPayment = (orderId: string, approved: boolean, reason?: string): boolean => {
    verifyPaymentMutation.mutate({ orderId, approved, reason });
    return true;
  };

  const scheduleDelivery = (orderId: string, details: any): boolean => {
    scheduleMutation.mutate({ orderId, details });
    return true;
  };

  const dispatchOrder = (orderId: string): boolean => {
    dispatchMutation.mutate(orderId);
    return true;
  };

  const markOrderDelivered = (orderId: string, proofNotes?: string): boolean => {
    deliverMutation.mutate({ orderId, proofNotes });
    return true;
  };

  const extendPaymentWindow = (orderId: string): boolean => {
    extendPaymentMutation.mutate(orderId);
    return true;
  };

  const cancelOrder = (orderId: string, reason: string): boolean => {
    cancelMutation.mutate({ orderId, reason });
    return true;
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        isLoadingOrders,
        createOrder,
        submitPaymentEvidence,
        verifyPayment,
        scheduleDelivery,
        dispatchOrder,
        markOrderDelivered,
        extendPaymentWindow,
        cancelOrder,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used within an OrdersProvider');
  return context;
};
