export const SENSITIVE_CACHE_CLEAR_EVENT = "sawiyaa:security:clear-sensitive-cache";

export function requestSensitiveCacheClear(reason: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SENSITIVE_CACHE_CLEAR_EVENT, {
      detail: { reason },
    })
  );
}
