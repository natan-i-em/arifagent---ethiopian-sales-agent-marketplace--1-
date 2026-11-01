import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds data stays fresh
      gcTime: 1000 * 60 * 60, // 1 hour memory persistence
      refetchOnWindowFocus: false, // Prevents aggressive blank-out refetches on tab focus
      retry: 1,
      placeholderData: (previousData: any) => previousData, // Retains existing data during background refetches so dashboards never flash blank
    },
  },
});
