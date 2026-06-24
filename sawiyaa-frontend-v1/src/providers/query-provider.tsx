"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useState } from "react";
import { TIME } from "@/lib/api/hooks/config";
import { toAppError } from "@/lib/api/errors";

interface QueryProviderProps {
  children: ReactNode;
}

function handleQueryError(error: unknown) {
  const appError = toAppError(error);

  if (appError.statusCode === 401) {
    return;
  }

  if (appError.statusCode === 403) {
    return;
  }
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  const appError = toAppError(error);

  if ([401, 403, 404].includes(appError.statusCode)) {
    return false;
  }

  return failureCount < 2;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: TIME.MINUTE,
            gcTime: 5 * TIME.MINUTE,
            retry: shouldRetry,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: process.env.NODE_ENV === "development",
            refetchOnReconnect: true,
            refetchOnMount: true,
            throwOnError: false,
          },
          mutations: {
            retry: 1,
            onError: handleQueryError,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}

export { QueryClient };
