import { QueryCache, QueryClient } from "@tanstack/react-query";

import { logger } from "@/core/logger";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error) {
      logger.error("Query error", error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function clearAppQueryCache() {
  queryClient.clear();
}
