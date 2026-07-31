"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUnifiedMessagingUnreadSummary } from "../api/messages-shell.api";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

export function useUnifiedUnreadBadge(role: UnifiedMessagingRole) {
  const queryClient = useQueryClient();
  const [isPageVisible, setIsPageVisible] = useState(
    () => (typeof document === "undefined" ? true : document.visibilityState === "visible"),
  );

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

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: ["unified-messages-shell", role, "unread-summary"],
      });
    };

    window.addEventListener("unified-messages:unread-summary:dirty", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("unified-messages:unread-summary:dirty", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [queryClient, role]);

  const unreadSummaryQuery = useQuery({
    queryKey: ["unified-messages-shell", role, "unread-summary"],
    queryFn: () => getUnifiedMessagingUnreadSummary(),
    staleTime: 10000,
    refetchInterval: isPageVisible ? 15000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return unreadSummaryQuery.data?.item.totalUnreadMessages ?? 0;

}
