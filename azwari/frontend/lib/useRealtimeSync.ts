'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiBase } from './api';

/**
 * Server-Sent Events (SSE) hook that listens to live backend order and settlement updates.
 * Pushes instant cache invalidations (<200ms) to TanStack Query so the dashboard updates live
 * without waiting for slow polling or manual page reloads.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const base = getApiBase().replace(/\/$/, '');
    const streamUrl = `${base}/realtime/stream`;

    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;

    const connect = () => {
      try {
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTED') return;

            // Invalidate queries in parallel for instant UI reflection
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['commissions'] });
            queryClient.invalidateQueries({ queryKey: ['settlementBatches'] });
            queryClient.invalidateQueries({ queryKey: ['salespersonBatches'] });
            queryClient.invalidateQueries({ queryKey: ['salesPartners'] });
            queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
          } catch (err) {
            // Silently ignore non-JSON heartbeat frames
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          if (reconnectTimer) clearTimeout(reconnectTimer);
          // Auto-reconnect after 4 seconds
          reconnectTimer = setTimeout(connect, 4000);
        };
      } catch (e) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 4000);
      }
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [queryClient]);
}

