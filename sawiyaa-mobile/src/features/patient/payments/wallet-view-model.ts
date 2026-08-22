import type {
  CustomerWalletEntryItem,
  CustomerWalletEntryType,
  PaymentItem,
  PaymentStatus,
} from "./types";

export type WalletEntryLabelKey =
  | "refund"
  | "walletCredit"
  | "sessionPayment"
  | "paymentReleased"
  | "reversal"
  | "adjustment";

export type PaymentStatusKey =
  | "processing"
  | "actionRequired"
  | "completed"
  | "failed"
  | "cancelled"
  | "refundProcessing"
  | "partiallyRefunded"
  | "refunded";

export type WalletActivityItem = {
  id: string;
  source: "wallet" | "payment";
  titleKey: WalletEntryLabelKey | "payment";
  amount: string;
  currencyCode: string;
  direction: "CREDIT" | "DEBIT";
  occurredAt: string;
  sessionId: string | null;
  paymentId: string | null;
  statusKey?: PaymentStatusKey;
};

const WALLET_ENTRY_LABELS: Record<CustomerWalletEntryType, WalletEntryLabelKey> = {
  REFUND_CREDIT: "refund",
  MANUAL_CREDIT: "walletCredit",
  MANUAL_DEBIT: "adjustment",
  SESSION_PAYMENT_RESERVE: "sessionPayment",
  SESSION_PAYMENT_CAPTURE: "sessionPayment",
  SESSION_PAYMENT_RELEASE: "paymentReleased",
  REVERSAL: "reversal",
  ADJUSTMENT: "adjustment",
};

export function mapWalletEntryToActivity(entry: CustomerWalletEntryItem): WalletActivityItem {
  return {
    id: `wallet-${entry.id}`,
    source: "wallet",
    titleKey: WALLET_ENTRY_LABELS[entry.entryType],
    amount: entry.amount,
    currencyCode: entry.currencyCode,
    direction: entry.direction,
    occurredAt: entry.effectiveAt,
    sessionId: entry.sessionId,
    paymentId: entry.paymentId,
  };
}

export function mapPaymentToActivity(payment: PaymentItem): WalletActivityItem {
  return {
    id: `payment-${payment.id}`,
    source: "payment",
    titleKey: "payment",
    amount: payment.amountTotal,
    currencyCode: payment.currency,
    direction: "DEBIT",
    occurredAt: payment.paidAt ?? payment.createdAt,
    sessionId: payment.sessionId,
    paymentId: null,
    statusKey: mapPaymentStatus(payment.status),
  };
}

export function buildFinancialActivity(entries: CustomerWalletEntryItem[], payments: PaymentItem[]) {
  const paymentIds = new Set(payments.map((payment) => payment.id));
  const walletItems = entries
    .map(mapWalletEntryToActivity)
    .filter((entry) => !entry.paymentId || !paymentIds.has(entry.paymentId));
  return sortWalletActivity([...walletItems, ...payments.map(mapPaymentToActivity)]);
}

export function sortWalletActivity(items: WalletActivityItem[]) {
  return [...items].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
}

export function mapPaymentStatus(status: PaymentStatus): PaymentStatusKey {
  switch (status) {
    case "CAPTURED":
      return "completed";
    case "FAILED":
      return "failed";
    case "CANCELLED":
    case "EXPIRED":
      return "cancelled";
    case "REFUND_PENDING":
      return "refundProcessing";
    case "PARTIALLY_REFUNDED":
      return "partiallyRefunded";
    case "REFUNDED":
      return "refunded";
    case "REQUIRES_ACTION":
      return "actionRequired";
    case "CREATED":
    case "PENDING":
    case "AUTHORIZED":
    default:
      return "processing";
  }
}

export function activityTitleKey(item: WalletActivityItem) {
  return item.source === "payment"
    ? "patientPaymentsFlow.activity.types.payment"
    : `patientPaymentsFlow.activity.types.${item.titleKey}`;
}

export function activityStatusKey(item: WalletActivityItem) {
  return item.statusKey ? `patientPaymentsFlow.activity.status.${item.statusKey}` : null;
}
