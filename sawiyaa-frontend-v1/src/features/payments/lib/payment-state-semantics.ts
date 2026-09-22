/** Payment collection is authoritative only after provider settlement. */
export function isAuthoritativePaymentCaptured(
  status: string | null | undefined,
): boolean {
  return status === "CAPTURED";
}
