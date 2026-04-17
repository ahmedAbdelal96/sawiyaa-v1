/**
 * Shared React Query cache configuration for the active Fayed foundation.
 */

export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

export const AUTH_CACHE = {
  user: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 30 * TIME.MINUTE,
  },
  sessions: {
    staleTime: 0,
    gcTime: 5 * TIME.MINUTE,
  },
  loginHistory: {
    staleTime: TIME.MINUTE,
    gcTime: 10 * TIME.MINUTE,
  },
} as const;

export const USERS_CACHE = {
  list: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  single: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
  stats: {
    staleTime: 5 * TIME.MINUTE,
    gcTime: 15 * TIME.MINUTE,
  },
} as const;

export const SETTINGS_CACHE = {
  all: {
    staleTime: 15 * TIME.MINUTE,
    gcTime: TIME.HOUR,
  },
  category: {
    staleTime: 15 * TIME.MINUTE,
    gcTime: TIME.HOUR,
  },
} as const;

export const DEFAULT_QUERY_OPTIONS = {
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

export const DEFAULT_MUTATION_OPTIONS = {
  retry: 1,
  retryDelay: 1000,
} as const;
