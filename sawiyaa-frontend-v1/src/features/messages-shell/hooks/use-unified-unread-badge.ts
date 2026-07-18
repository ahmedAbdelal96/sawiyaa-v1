"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCanonicalUnreadSummary } from "../api/messages-shell.api";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

export function useUnifiedUnreadBadge(role: UnifiedMessagingRole) {
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

  const unreadSummaryQuery = useQuery({
    queryKey: ["canonical-unread-summary", role],
    queryFn: () => getCanonicalUnreadSummary(),
    staleTime: 10000,
    refetchInterval: isPageVisible ? 15000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  const summary = unreadSummaryQuery.data;

  if (role === "admin") {
    return summary?.item.needsSupportReplyCount ?? 0;
  }
  return summary?.item.unreadCount ?? 0;

}
