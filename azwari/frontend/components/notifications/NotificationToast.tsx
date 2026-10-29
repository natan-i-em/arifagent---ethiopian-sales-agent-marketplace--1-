'use client';

import React from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { TopRightToastContainer } from './TopRightToastContainer';

export const NotificationToast: React.FC = () => {
  const { toasts, dismissToast, openModalById } = useNotifications();

  return (
    <TopRightToastContainer
      toasts={toasts}
      onDismiss={dismissToast}
      onOpenNotificationModal={openModalById}
    />
  );
};
