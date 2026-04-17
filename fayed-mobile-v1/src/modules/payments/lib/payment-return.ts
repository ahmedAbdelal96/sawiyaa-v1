import * as Linking from "expo-linking";

export type PaymentReturnPayload = {
  paymentId?: string;
  sessionId?: string;
  status?: string;
};

export function parsePaymentReturnUrl(url: string): PaymentReturnPayload {
  const parsed = Linking.parse(url);
  const query = parsed.queryParams || {};

  const paymentId =
    typeof query.paymentId === "string"
      ? query.paymentId
      : typeof query.payment_id === "string"
        ? query.payment_id
        : undefined;

  const sessionId =
    typeof query.sessionId === "string"
      ? query.sessionId
      : typeof query.session_id === "string"
        ? query.session_id
        : undefined;

  const status = typeof query.status === "string" ? query.status : undefined;

  return { paymentId, sessionId, status };
}

export type CanonicalPaymentReturnState =
  | "success"
  | "failed"
  | "pending"
  | "unknown";

export function mapPaymentReturnStatus(status?: string | null): CanonicalPaymentReturnState {
  if (!status) return "unknown";
  const normalized = status.toUpperCase().trim();

  if (
    normalized === "SUCCEEDED" ||
    normalized === "SUCCESS" ||
    normalized === "PAID" ||
    normalized === "CAPTURED"
  ) {
    return "success";
  }

  if (
    normalized === "FAILED" ||
    normalized === "FAIL" ||
    normalized === "DECLINED" ||
    normalized === "CANCELLED" ||
    normalized === "EXPIRED"
  ) {
    return "failed";
  }

  if (normalized === "PENDING" || normalized === "PROCESSING" || normalized === "REQUIRES_ACTION") {
    return "pending";
  }

  return "unknown";
}

export function resolvePaymentCheckoutTarget(payment: {
  checkoutUrl: string | null;
  clientSecret: string | null;
}) {
  if (payment.checkoutUrl) {
    return { type: "checkoutUrl" as const, value: payment.checkoutUrl };
  }

  if (payment.clientSecret) {
    return { type: "clientSecret" as const, value: payment.clientSecret };
  }

  return { type: "none" as const, value: null };
}
