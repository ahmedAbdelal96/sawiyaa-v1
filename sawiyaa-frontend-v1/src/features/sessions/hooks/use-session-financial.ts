import { useQuery } from "@tanstack/react-query";
import { getSessionFinancialBreakdown } from "../api/financial.api";

export const sessionFinancialQueryKeys = {
  breakdown: (sessionId: string, couponCode?: string | null) =>
    ["session-financial", sessionId, "breakdown", couponCode ?? null] as const,
};

/**
 * Fetches the financial breakdown for a session.
 * Re-fetches automatically when couponCode changes.
 */
export function useSessionFinancialBreakdown(
  sessionId: string | null,
  couponCode?: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: sessionFinancialQueryKeys.breakdown(sessionId ?? "", couponCode),
    queryFn: () => getSessionFinancialBreakdown(sessionId!, couponCode),
    enabled: Boolean(sessionId) && (options?.enabled ?? true),
    staleTime: 60_000,
    retry: 1,
  });
}
