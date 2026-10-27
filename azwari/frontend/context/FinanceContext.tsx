'use client';

import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionsApi, disputesApi, auditLogsApi, smsApi } from '../lib/api';
import {
  CommissionLedgerEntry,
  PlatformFeeLedgerEntry,
  SettlementBatch,
  Dispute,
  AuditLog,
  SmsMessage,
} from '../types';

interface FinanceContextType {
  commissionLedger: CommissionLedgerEntry[];
  platformFeeLedger: PlatformFeeLedgerEntry[];
  settlementBatches: SettlementBatch[];
  disputes: Dispute[];
  auditLogs: AuditLog[];
  smsOutbox: SmsMessage[];
  isLoadingFinance: boolean;
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
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: commissionsData, isLoading: loadingCommissions } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => commissionsApi.getAll(),
  });

  const { data: batchesData, isLoading: loadingBatches } = useQuery({
    queryKey: ['settlementBatches'],
    queryFn: () => commissionsApi.getBatches(),
  });

  const { data: disputesData, isLoading: loadingDisputes } = useQuery({
    queryKey: ['disputes'],
    queryFn: () => disputesApi.getAll(),
  });

  const { data: auditLogsData, isLoading: loadingAudit } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => auditLogsApi.getAll(),
  });

  const { data: smsData, isLoading: loadingSms } = useQuery({
    queryKey: ['smsOutbox'],
    queryFn: () => smsApi.getOutbox(),
  });

  const commissionLedger = commissionsData?.commissions || [];
  const rawBatches = batchesData?.batches || [];

  const settlementBatches: SettlementBatch[] = rawBatches.map((b: any) => ({
    id: b.id,
    batchNumber: b.batchNumber,
    recipientType: 'salesperson' as const,
    recipientId: b.salespersonId || '',
    recipientName: b.recipientName || 'Sales Agent',
    totalAmount: Number(b.totalAmount),
    commissionLedgerIds: [],
    payoutMethod: (b.payoutMethod as any) || 'Telebirr B2C',
    destinationAccount: b.destinationAccount || '',
    transactionReference: b.transactionReference || '',
    status: (b.status as any) || 'settled',
    settledAt: b.settledAt || new Date().toISOString(),
    createdByName: 'Finance Ops Desk',
  }));

  const disputes = disputesData?.disputes || [];
  const auditLogs = auditLogsData?.auditLogs || [];
  const smsOutbox = smsData?.outbox || [];

  // Derive platform fee ledger from orders/commission calculations
  const platformFeeLedger: PlatformFeeLedgerEntry[] = commissionLedger.map((c) => ({
    id: 'fee_' + c.id,
    orderId: c.orderId,
    orderNumber: c.orderNumber,
    supplierId: c.supplierId,
    supplierName: c.supplierName,
    amount: Math.round(Number(c.amount) * 0.167), // ~2% platform fee relative to 12% commission
    rate: 0.02,
    status: c.status === 'paid' ? ('paid' as const) : c.status === 'eligible' ? ('secured' as const) : ('accrued' as const),
    createdAt: c.createdAt,
  }));

  const settleMutation = useMutation({
    mutationFn: (data: {
      salespersonId: string;
      payoutMethod: string;
      transactionReference: string;
      entryIds?: string[];
    }) => commissionsApi.settle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['settlementBatches'] });
      queryClient.invalidateQueries({ queryKey: ['salesPartners'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  const createDisputeMutation = useMutation({
    mutationFn: (data: { orderId: string; category: string; reason: string }) =>
      disputesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { resolutionDecision: string; resolutionNote: string } }) =>
      disputesApi.resolve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  const settleCommissions = (
    salespersonId: string,
    commissionEntryIds: string[],
    payoutMethod: 'Telebirr B2C' | 'CBE Direct Transfer' | 'Awash Bank Transfer',
    transactionReference: string
  ): boolean => {
    settleMutation.mutate({
      salespersonId,
      payoutMethod,
      transactionReference,
      entryIds: commissionEntryIds,
    });
    return true;
  };

  const createDispute = (
    orderId: string,
    category: Dispute['category'],
    reason: string,
    _raisedByRole: 'salesperson' | 'supplier' | 'customer',
    _raisedByName: string
  ): boolean => {
    createDisputeMutation.mutate({ orderId, category, reason });
    return true;
  };

  const resolveDispute = (disputeId: string, decision: string, note: string): boolean => {
    resolveDisputeMutation.mutate({
      id: disputeId,
      data: { resolutionDecision: decision, resolutionNote: note },
    });
    return true;
  };

  return (
    <FinanceContext.Provider
      value={{
        commissionLedger,
        platformFeeLedger,
        settlementBatches,
        disputes,
        auditLogs,
        smsOutbox,
        isLoadingFinance: loadingCommissions || loadingBatches || loadingDisputes || loadingAudit || loadingSms,
        settleCommissions,
        createDispute,
        resolveDispute,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
