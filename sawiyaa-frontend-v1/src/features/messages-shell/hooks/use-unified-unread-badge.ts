"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUnifiedMessagingUnreadSummary } from "../api/messages-shell.api";
import type {
  UnifiedMessagingRole,
  UnifiedMessagingUnreadSummary,
} from "../types/messages-shell.types";

export function useUnifiedUnreadBadge(role: UnifiedMessagingRole) {
  const [isPageVisible, setIsPageVisible] = useState(
    () => (typeof document === "undefined" ? true : document.visibilityState === "visible"),
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const unreadSummaryQueryKey = useMemo(
    () => ["unified-messages-shell", role, "unread-summary"] as const,
    [role],
  );

  const unreadSummaryQuery = useQuery({
    queryKey: unreadSummaryQueryKey,
    queryFn: () => getUnifiedMessagingUnreadSummary(),
    initialData: () =>
      queryClient.getQueryData<{ item: UnifiedMessagingUnreadSummary }>(
        unreadSummaryQueryKey,
      ),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
    refetchInterval: isPageVisible ? 20_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  return unreadSummaryQuery.data?.item.totalUnreadMessages ?? 0;
}
