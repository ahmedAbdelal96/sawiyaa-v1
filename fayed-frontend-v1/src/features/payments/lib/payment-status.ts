import type { PaymentItem, PaymentStatus } from "../types/payments.types";

const CONTINUABLE_PAYMENT_STATUSES: PaymentStatus[] = [
  "CREATED",
  "PENDING",
  "REQUIRES_ACTION",
];

const RETRYABLE_PAYMENT_STATUSES: PaymentStatus[] = ["FAILED", "CANCELLED"];

export function canContinuePayment(payment: PaymentItem): boolean {
  return Boolean(payment.sessionId) && CONTINUABLE_PAYMENT_STATUSES.includes(payment.status);
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
