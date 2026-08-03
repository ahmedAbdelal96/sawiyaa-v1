"use client";

import { useEffect, useRef } from "react";
import { useAuthStore, selectUser } from "@/stores/auth-store";
import {
  detectBrowserIanaTimeZone,
  isMissingPersistedTimeZone,
} from "@/lib/timezone-initialization";
import {
  useCurrentUser,
  useInitializeCurrentUserTimezone,
} from "@/features/users/hooks/use-users";

/**
 * The single Web post-auth initialization point. It is deliberately best-effort:
 * a missing detector or failed request must never block navigation or login.
 */
export function AutomaticTimeZoneInitializer() {
  const user = useAuthStore(selectUser);
  const attemptedUserIds = useRef(new Set<string>());
  const currentUserQuery = useCurrentUser(
    typeof window !== "undefined" && Boolean(user),
  );
  const { mutateAsync: initializeTimezone } =
    useInitializeCurrentUserTimezone();

  useEffect(() => {
    const currentUser = currentUserQuery.data;
    const userId = currentUser?.userId;

    if (!userId || attemptedUserIds.current.has(userId)) return;

    // Non-empty legacy values are not silently repaired. They require an
    // explicit settings/repair path; only null/empty values are eligible.
    if (!isMissingPersistedTimeZone(currentUser.timezone)) return;

    attemptedUserIds.current.add(userId);
    const detected = detectBrowserIanaTimeZone();
    if (!detected) return;

    void initializeTimezone(detected).catch(() => {
      // Initialization is non-blocking and intentionally does not retry in a loop.
    });
  }, [currentUserQuery.data, initializeTimezone]);

  return null;
}
