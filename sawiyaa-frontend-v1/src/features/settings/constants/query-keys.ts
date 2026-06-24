export const settingsQueryKeys = {
  all: ["settings"] as const,
  me: () => [...settingsQueryKeys.all, "me"] as const,
  mePreferences: () => [...settingsQueryKeys.all, "me", "preferences"] as const,
  meNotificationPreferences: () =>
    [...settingsQueryKeys.all, "me", "notification-preferences"] as const,
};
