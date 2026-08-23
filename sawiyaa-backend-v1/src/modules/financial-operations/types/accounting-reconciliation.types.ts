import {
  JournalEntrySourceType,
  ReconciliationReviewStatus,
} from '@prisma/client';

export type ReconciliationAnomalyCode =
  | 'MISSING_JOURNAL_ENTRY'
  | 'MISSING_PAYOUT_PROOF'
  | 'AMOUNT_MISMATCH'
  | 'MISSING_VAT_SNAPSHOT'
  | 'MISSING_GATEWAY_FEE_SNAPSHOT'
  | 'MISSING_CANCELLATION_CONTEXT'
  | 'MISSING_TRANSFER_FEE_SNAPSHOT';

export type ReconciliationAnomaly = {
  code: ReconciliationAnomalyCode;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
};

export type ReconciliationSystemStatus =
  | 'MATCHED'
  | 'MISMATCH'
  | 'MISSING_PROOF'
  | 'REQUIRES_ADJUSTMENT';

export type ReconciliationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type ReconciliationIssue = {
  code: string;
  severity: ReconciliationSeverity;
  message: string;
  entityType: string;
  entityId: string;
  expected?: string | number | null;
  actual?: string | number | null;
  currencyCode?: string | null;
  metadata?: Record<string, unknown>;
};

export type ReconciliationResult = {
  ok: boolean;
  checkedAt: Date;
  scope: string;
  entityType: string;
  entityId: string;
  currencyCode?: string | null;
  issues: ReconciliationIssue[];
  summary?: Record<string, unknown>;
};

export const ACCOUNTING_RECONCILIATION_ISSUE_CODES = {
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RECONCILIATION_EXECUTION_ERROR: 'RECONCILIATION_EXECUTION_ERROR',
  PAYMENT_MISSING_LEDGER_ENTRIES: 'PAYMENT_MISSING_LEDGER_ENTRIES',
  PAYMENT_NON_CAPTURED_HAS_LEDGER_ENTRIES:
    'PAYMENT_NON_CAPTURED_HAS_LEDGER_ENTRIES',
  PAYMENT_UNEXPECTED_LEDGER_ENTRY_TYPE: 'PAYMENT_UNEXPECTED_LEDGER_ENTRY_TYPE',
  PAYMENT_LEDGER_BREAKDOWN_MISMATCH: 'PAYMENT_LEDGER_BREAKDOWN_MISMATCH',
  PAYMENT_COLLECTION_MISMATCH: 'PAYMENT_COLLECTION_MISMATCH',
  PAYMENT_AMOUNT_TOTAL_MISMATCH: 'PAYMENT_AMOUNT_TOTAL_MISMATCH',
  PAYMENT_JOURNAL_UNBALANCED: 'PAYMENT_JOURNAL_UNBALANCED',
  PAYMENT_JOURNAL_METADATA_MISMATCH: 'PAYMENT_JOURNAL_METADATA_MISMATCH',
  PAYMENT_COUPON_REDEMPTION_MISSING: 'PAYMENT_COUPON_REDEMPTION_MISSING',
  PAYMENT_COUPON_SNAPSHOT_MISMATCH: 'PAYMENT_COUPON_SNAPSHOT_MISMATCH',
  PAYMENT_COUPON_OWNER_MISMATCH: 'PAYMENT_COUPON_OWNER_MISMATCH',
  PAYMENT_COUPON_SCOPE_MISMATCH: 'PAYMENT_COUPON_SCOPE_MISMATCH',
  PAYMENT_PENDING_TOO_LONG: 'PAYMENT_PENDING_TOO_LONG',
  PAYMENT_CAPTURED_EVENT_MISSING: 'PAYMENT_CAPTURED_EVENT_MISSING',
  PAYMENT_WEBHOOK_RECEIPT_MISSING: 'PAYMENT_WEBHOOK_RECEIPT_MISSING',
  PAYMENT_SESSION_STATUS_MISMATCH: 'PAYMENT_SESSION_STATUS_MISMATCH',
  PAYMENT_WALLET_CAPTURE_MISSING: 'PAYMENT_WALLET_CAPTURE_MISSING',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_AVAILABLE_MISMATCH: 'WALLET_AVAILABLE_MISMATCH',
  WALLET_PENDING_MISMATCH: 'WALLET_PENDING_MISMATCH',
  WALLET_RESERVED_MISMATCH: 'WALLET_RESERVED_MISMATCH',
  WALLET_LIFETIME_EARNED_MISMATCH: 'WALLET_LIFETIME_EARNED_MISMATCH',
  WALLET_LIFETIME_PAID_OUT_MISMATCH: 'WALLET_LIFETIME_PAID_OUT_MISMATCH',
  WALLET_LAST_ENTRY_MISMATCH: 'WALLET_LAST_ENTRY_MISMATCH',
  WALLET_RESERVATION_MISMATCH: 'WALLET_RESERVATION_MISMATCH',
  SETTLEMENT_NOT_FOUND: 'SETTLEMENT_NOT_FOUND',
  SETTLEMENT_CURRENCY_MISMATCH: 'SETTLEMENT_CURRENCY_MISMATCH',
  SETTLEMENT_GROSS_MISMATCH: 'SETTLEMENT_GROSS_MISMATCH',
  SETTLEMENT_NET_MISMATCH: 'SETTLEMENT_NET_MISMATCH',
  SETTLEMENT_PAID_TOTAL_MISMATCH: 'SETTLEMENT_PAID_TOTAL_MISMATCH',
  SETTLEMENT_PAYOUT_LEDGER_MISMATCH: 'SETTLEMENT_PAYOUT_LEDGER_MISMATCH',
  SETTLEMENT_BATCH_CURRENCY_MISMATCH: 'SETTLEMENT_BATCH_CURRENCY_MISMATCH',
  SETTLEMENT_BATCH_TOTAL_MISMATCH: 'SETTLEMENT_BATCH_TOTAL_MISMATCH',
  REFUND_NOT_FOUND: 'REFUND_NOT_FOUND',
  REFUND_JOURNAL_UNBALANCED: 'REFUND_JOURNAL_UNBALANCED',
  REFUND_JOURNAL_CURRENCY_MISMATCH: 'REFUND_JOURNAL_CURRENCY_MISMATCH',
  REFUND_LEDGER_MISMATCH: 'REFUND_LEDGER_MISMATCH',
  REFUND_CUSTOMER_WALLET_CREDIT_MISSING:
    'REFUND_CUSTOMER_WALLET_CREDIT_MISSING',
  PACKAGE_SETTLEMENT_NOT_FOUND: 'PACKAGE_SETTLEMENT_NOT_FOUND',
  PACKAGE_SETTLEMENT_CURRENCY_MISMATCH:
    'PACKAGE_SETTLEMENT_CURRENCY_MISMATCH',
  PACKAGE_SETTLEMENT_COMPLETION_MISMATCH:
    'PACKAGE_SETTLEMENT_COMPLETION_MISMATCH',
  PACKAGE_SETTLEMENT_AMOUNT_MISMATCH: 'PACKAGE_SETTLEMENT_AMOUNT_MISMATCH',
  PACKAGE_SETTLEMENT_RELEASE_MISMATCH: 'PACKAGE_SETTLEMENT_RELEASE_MISMATCH',
} as const;

export type AccountingReconciliationIssueCode =
  (typeof ACCOUNTING_RECONCILIATION_ISSUE_CODES)[keyof typeof ACCOUNTING_RECONCILIATION_ISSUE_CODES];

export const ACCOUNTING_RECONCILIATION_ISSUE_COPY = {
  PAYMENT_PENDING_TOO_LONG: {
    title: { en: 'Payment pending too long', ar: 'الدفع ما زال معلّقًا لفترة طويلة' },
    shortDescription: { en: 'The payment exceeded the pending review threshold.', ar: 'تجاوز الدفع المدة المحددة للمراجعة وهو ما زال معلّقًا.' },
    severityExplanation: { en: 'A delayed provider response may require operational review.', ar: 'قد تتطلب استجابة مزود الدفع المتأخرة مراجعة تشغيلية.' },
  },
  PAYMENT_CAPTURED_EVENT_MISSING: {
    title: { en: 'Captured event is missing', ar: 'حدث إتمام الدفع مفقود' },
    shortDescription: { en: 'The payment is captured but has no PAYMENT_CAPTURED audit event.', ar: 'الدفع مكتمل، لكن لا يوجد حدث تدقيق PAYMENT_CAPTURED.' },
    severityExplanation: { en: 'The payment audit trail is incomplete.', ar: 'سجل تدقيق الدفع غير مكتمل.' },
  },
  PAYMENT_WEBHOOK_RECEIPT_MISSING: {
    title: { en: 'Webhook receipt is missing', ar: 'إيصال Webhook مفقود' },
    shortDescription: { en: 'A post-rollout Paymob payment has no stored webhook receipt.', ar: 'لا يوجد إيصال Webhook محفوظ لدفع Paymob بعد تفعيل التتبع.' },
    severityExplanation: { en: 'The provider notification cannot be proven from the receipt ledger.', ar: 'لا يمكن إثبات وصول إشعار المزود من سجل الإيصالات.' },
  },
  PAYMENT_SESSION_STATUS_MISMATCH: {
    title: { en: 'Payment and session status mismatch', ar: 'تعارض بين حالة الدفع والجلسة' },
    shortDescription: { en: 'The linked payment and session are in incompatible states.', ar: 'الدفع والجلسة المرتبطان في حالتين غير متوافقتين.' },
    severityExplanation: { en: 'The session may not reflect the payment outcome.', ar: 'قد لا تعكس الجلسة نتيجة الدفع.' },
  },
  PAYMENT_WALLET_CAPTURE_MISSING: {
    title: { en: 'Wallet capture is missing or mismatched', ar: 'خصم المحفظة مفقود أو غير متطابق' },
    shortDescription: { en: 'Captured wallet-funded payment lacks the expected capture amount.', ar: 'الدفع الممول من المحفظة لا يحتوي على مبلغ الخصم المتوقع.' },
    severityExplanation: { en: 'Wallet financial effects require operational review.', ar: 'تحتاج آثار المحفظة المالية إلى مراجعة تشغيلية.' },
  },
} as const;

export type ReconciliationOverviewViewModel = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  currencyCode: string | null;
  totals: {
    totalItems: number;
    matched: number;
    pendingReview: number;
    mismatch: number;
    missingProof: number;
    requiresAdjustment: number;
    resolved: number;
  };
  anomalies: Array<{
    code: ReconciliationAnomalyCode;
    count: number;
  }>;
};

export type ReconciliationItemViewModel = {
  sourceType: JournalEntrySourceType;
  sourceId: string;
  sessionId: string | null;
  sessionCode: string | null;
  practitionerId: string | null;
  paymentId: string | null;
  refundId: string | null;
  settlementId: string | null;
  payoutId: string | null;
  currencyCode: string;
  occurredAt: string;
  operationalAmount: string;
  journalEntryId: string | null;
  journalOccurredAt: string | null;
  journalAmount: string | null;
  proofPresent: boolean | null;
  systemStatus: ReconciliationSystemStatus;
  reviewStatus: ReconciliationReviewStatus | null;
  effectiveStatus: ReconciliationReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewedByDisplayName: string | null;
  anomalies: ReconciliationAnomaly[];
};

export type ReconciliationListViewModel = {
  items: ReconciliationItemViewModel[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    from: string;
    to: string;
    sourceType: JournalEntrySourceType | null;
    practitionerId: string | null;
    currencyCode: string | null;
    status: ReconciliationReviewStatus | null;
    query: string | null;
    anomalyCode: ReconciliationAnomalyCode | null;
  };
};
