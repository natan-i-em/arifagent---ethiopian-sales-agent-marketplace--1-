'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface RealtimeContextType {
  isConnected: boolean;
  lastEventTime: Date | null;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  lastEventTime: null,
});

export const useRealtime = () => useContext(RealtimeContext);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  useEffect(() => {
    // Multi-table unified realtime broadcast channel
    const channel = supabase
      .channel('azwari-global-realtime')
      // 1. ORDERS
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Order' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['publicOrder'] });
          queryClient.invalidateQueries({ queryKey: ['commissions'] });
          queryClient.invalidateQueries({ queryKey: ['supplierWallet'] });
          queryClient.invalidateQueries({ queryKey: ['salespersonWallet'] });
        }
      )
      // 2. PAYMENT RECEIPTS (Screenshots & Verifications)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'PaymentReceipt' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['publicOrder'] });
          queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
        }
      )
      // 3. PRODUCTS & CATALOG
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Product' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['catalog'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ProductVariant' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      // 4. WALLET & TOPUPS & PAYOUTS
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Wallet' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['supplierWallet'] });
          queryClient.invalidateQueries({ queryKey: ['salespersonWallet'] });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Deposit' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['supplierWallet'] });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['deposits'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Payout' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['salespersonWallet'] });
          queryClient.invalidateQueries({ queryKey: ['supplierWallet'] });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['payouts'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'WalletTransaction' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['supplierWallet'] });
          queryClient.invalidateQueries({ queryKey: ['salespersonWallet'] });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
        }
      )
      // 5. COMMISSIONS
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'CommissionEscrow' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['commissions'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['salespersonWallet'] });
        }
      )
      // 6. DISPUTES
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Dispute' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['disputes'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      // 7. WAITLIST & REGISTRATION APPROVALS
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'WaitlistEntry' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['waitlist'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Business' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['businesses'] });
          queryClient.invalidateQueries({ queryKey: ['waitlist'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'SalesPartner' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['salesPartners'] });
          queryClient.invalidateQueries({ queryKey: ['waitlist'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'SupplierPaymentAccount' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['businesses'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['publicOrder'] });
        }
      )
      // 8. AUDIT LOGS
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'AuditLog' },
        (payload) => {
          setLastEventTime(new Date());
          queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('⚡ [AZWARI REALTIME] Connected to global realtime stream');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEventTime }}>
      {children}
    </RealtimeContext.Provider>
  );
};

