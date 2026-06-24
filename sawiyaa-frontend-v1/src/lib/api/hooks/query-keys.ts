/**
 * React Query key factory for active Sawiyaa modules.
 */

export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
  sessions: () => [...authKeys.all, "sessions"] as const,
  loginHistory: () => [...authKeys.all, "login-history"] as const,
};

export const usersKeys = {
  all: ["users"] as const,
  lists: () => [...usersKeys.all, "list"] as const,
  list: (filters?: Record<string, any>) => [...usersKeys.lists(), filters] as const,
  details: () => [...usersKeys.all, "detail"] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
  stats: () => [...usersKeys.all, "stats"] as const,
};

export const settingsKeys = {
  all: ["settings"] as const,
  allSettings: () => [...settingsKeys.all, "all"] as const,
  category: (category: string) => [...settingsKeys.all, category] as const,
};

export const queryKeys = {
  auth: authKeys,
  users: usersKeys,
  settings: settingsKeys,
};
