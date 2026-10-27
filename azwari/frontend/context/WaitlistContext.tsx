'use client';

import React, { createContext, useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { waitlistApi } from '../lib/api';
import { WaitlistEntry, SmsMessage } from '../types';

interface WaitlistContextType {
  waitlist: WaitlistEntry[];
  showWaitlistModal: boolean;
  setShowWaitlistModal: (open: boolean) => void;
  waitlistRolePreference: 'sales_agent' | 'supplier';
  setWaitlistRolePreference: (role: 'sales_agent' | 'supplier') => void;
  recentSmsAlert: SmsMessage | null;
  dismissSmsAlert: () => void;
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
}

const WaitlistContext = createContext<WaitlistContextType | undefined>(undefined);

export const WaitlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [showWaitlistModal, setShowWaitlistModal] = useState<boolean>(false);
  const [waitlistRolePreference, setWaitlistRolePreference] = useState<'sales_agent' | 'supplier'>('sales_agent');
  const [recentSmsAlert, setRecentSmsAlert] = useState<SmsMessage | null>(null);

  const dismissSmsAlert = () => setRecentSmsAlert(null);

  const { data } = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => waitlistApi.getAll(),
  });

  const waitlist = data?.waitlist || [];

  const joinMutation = useMutation({
    mutationFn: (entryData: any) => waitlistApi.join(entryData),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      if (res?.entry) {
        setRecentSmsAlert({
          id: 'sms_' + Date.now().toString(36),
          recipientPhone: res.entry.phone,
          templateName: 'waitlist_joined',
          orderNumber: `WAIT-${res.entry.waitlistNumber}`,
          messageBody: `Azwari: Welcome ${res.entry.fullName}! You are #${res.entry.waitlistNumber} on the waitlist. Referral code: ${res.entry.referralCode}.`,
          provider: 'SMS Ethiopia Gateway',
          status: 'delivered',
          attempts: 1,
          sentAt: new Date().toISOString(),
          providerRef: 'ETH-SMS-WAIT',
        });
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (id: string) => waitlistApi.invite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  });

  const joinWaitlist = (data: any): { success: boolean; entry: WaitlistEntry } => {
    try {
      joinMutation.mutate(data);
      const fallbackEntry: WaitlistEntry = {
        id: 'wait_' + Date.now().toString(36),
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
        subcity: data.subcity,
        telegramUsername: data.telegramUsername,
        categoryOrChannel: data.categoryOrChannel,
        estimatedScale: data.estimatedScale,
        referralCode: `${data.fullName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        referralCount: 0,
        waitlistNumber: waitlist.length + 1,
        status: 'waitlisted',
        joinedAt: new Date().toISOString(),
      };
      return { success: true, entry: fallbackEntry };
    } catch {
      return {
        success: false,
        entry: {} as any,
      };
    }
  };

  const inviteWaitlistEntry = (id: string): boolean => {
    inviteMutation.mutate(id);
    return true;
  };

  return (
    <WaitlistContext.Provider
      value={{
        waitlist,
        showWaitlistModal,
        setShowWaitlistModal,
        waitlistRolePreference,
        setWaitlistRolePreference,
        recentSmsAlert,
        dismissSmsAlert,
        joinWaitlist,
        inviteWaitlistEntry,
      }}
    >
      {children}
    </WaitlistContext.Provider>
  );
};

export const useWaitlist = () => {
  const context = useContext(WaitlistContext);
  if (!context) throw new Error('useWaitlist must be used within a WaitlistProvider');
  return context;
};
