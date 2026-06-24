import type { AdminSessionInspectorRecommendedOutcome } from "../types/admin-session-runtime.types";

/**
 * Maps the backend recommendedReason (which may be an English machine-generated
 * string from the engine) to a translated user-facing explanation.
 *
 * Priority:
 *  1. The reason key under `inspector.reasons.<OUTCOME>` (translated, locale-aware).
 *  2. If the engine provided a custom reason that is already in the same language
 *     (e.g. a future admin override), use it as-is.
 *  3. Fall back to a generic translated fallback.
 */
export function resolveInspectorReason(
  outcome: AdminSessionInspectorRecommendedOutcome,
  backendReason: string | null | undefined,
  t: (key: string) => string,
): string {
  const mapped = t(`inspector.reasons.${outcome}`);
  if (mapped && mapped !== `inspector.reasons.${outcome}`) {
    return mapped;
  }

  if (typeof backendReason === "string" && backendReason.trim().length > 0) {
    return backendReason;
  }

  return t("inspector.reasons.FALLBACK");
}
