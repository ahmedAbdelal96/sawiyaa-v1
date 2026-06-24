import type { PaymentItem, PaymentStatus } from "../types/payments.types";

const CONTINUABLE_PAYMENT_STATUSES: PaymentStatus[] = [
  "CREATED",
  "PENDING",
  "REQUIRES_ACTION",
];

const RETRYABLE_PAYMENT_STATUSES: PaymentStatus[] = ["FAILED", "CANCELLED"];

type PaymentExpiryLike = Pick<PaymentItem, "expiredAt">;
type ContinuablePaymentLike = Pick<PaymentItem, "expiredAt" | "sessionId" | "status">;

export function isPaymentExpired(payment: PaymentExpiryLike, now = Date.now()): boolean {
  if (!payment.expiredAt) return false;
  const expiredAt = new Date(payment.expiredAt).getTime();
  return Number.isFinite(expiredAt) && expiredAt <= now;
}

export function canContinuePayment(payment: ContinuablePaymentLike): boolean {
  return (
    Boolean(payment.sessionId) &&
    CONTINUABLE_PAYMENT_STATUSES.includes(payment.status) &&
    !isPaymentExpired(payment)
  );
}

export function canRetryPayment(payment: PaymentItem): boolean {
  return Boolean(payment.sessionId) && RETRYABLE_PAYMENT_STATUSES.includes(payment.status);
}

export function getPaymentStatusNoteKey(status: PaymentStatus): string {
  return `history.notes.${status}`;
}

export function getPaymentPrimaryActionKey(payment: PaymentItem): string | null {
  if (canContinuePayment(payment)) {
    return "history.continuePayment";
  }

  if (canRetryPayment(payment)) {
    return "history.retryPayment";
  }

  return null;
}
