'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from './api';

/** Shared client so background commands can invalidate views they touched. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          if (error instanceof ApiError) {
            // Never retry auth/permission/validation failures — they are terminal.
            if ([400, 401, 403, 404, 409, 422].includes(error.status)) return false;
          }
          return count < 1;
        },
      },
      mutations: { retry: false },
    },
  });
}

export let queryClient = createQueryClient();

export function AdminQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => queryClient ?? (queryClient = createQueryClient()));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
