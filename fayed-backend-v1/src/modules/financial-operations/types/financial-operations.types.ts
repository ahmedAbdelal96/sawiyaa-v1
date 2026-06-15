import { AppRole } from '@common/enums/app-role.enum';
import {
  LedgerDirection,
  LedgerEntryType,
  PackageSettlementStatus,
  PatientPackagePurchaseStatus,
  PractitionerSettlementStatus,
  SettlementPayoutMethod,
  SettlementPayoutSource,
  SettlementBatchStatus,
  PractitionerPayoutMethodType,
  WalletBalanceBucket,
} from '@prisma/client';

export const FINANCIAL_OPS_ERROR_CODES = {
  invalidFilter: 'FINANCIAL_OPS_INVALID_FILTER',
  forbiddenScope: 'FINANCIAL_OPS_FORBIDDEN_SCOPE',
  resourceNotFoundInScope: 'FINANCIAL_OPS_RESOURCE_NOT_FOUND_IN_SCOPE',
  settlementItemNotFound: 'FINANCIAL_OPERATIONS_SETTLEMENT_ITEM_NOT_FOUND',
  settlementPayoutNotFound: 'FINANCIAL_OPERATIONS_SETTLEMENT_PAYOUT_NOT_FOUND',
  settlementPayoutAlreadyRecorded:
    'FINANCIAL_OPERATIONS_SETTLEMENT_PAYOUT_ALREADY_RECORDED',
  invalidSettlementPayoutState:
    'FINANCIAL_OPERATIONS_INVALID_SETTLEMENT_PAYOUT_STATE',
  payoutAmountInvalid: 'FINANCIAL_OPERATIONS_PAYOUT_AMOUNT_INVALID',
  payoutAmountExceedsDue: 'FINANCIAL_OPERATIONS_PAYOUT_AMOUNT_EXCEEDS_DUE',
  manualPayoutAlreadyRecorded:
    'FINANCIAL_OPERATIONS_MANUAL_PAYOUT_ALREADY_RECORDED',
  payoutProofFileRequired: 'FINANCIAL_OPERATIONS_PAYOUT_PROOF_FILE_REQUIRED',
  payoutProofInvalidType: 'FINANCIAL_OPERATIONS_PAYOUT_PROOF_INVALID_TYPE',
  payoutProofFileTooLarge: 'FINANCIAL_OPERATIONS_PAYOUT_PROOF_FILE_TOO_LARGE',
  payoutProofNotFound: 'FINANCIAL_OPERATIONS_PAYOUT_PROOF_NOT_FOUND',
} as const;

export const FINANCIAL_OPS_ROUTE_SCOPE = {
  adminOperatorOnly: [
    '/admin/settlements',
    '/admin/practitioner-payouts',
    '/admin/finance/operations/events',
    '/admin/practitioners/:practitionerId/statement',
  ],
  practitionerSelfOnly: [
    '/practitioners/me/wallet',
    '/practitioners/me/ledger',
    '/practitioners/me/settlements',
  ],
} as const;

export const FINANCIAL_OPS_ADMIN_ALLOWED_ROLES: AppRole[] = [
  AppRole.ADMIN,
  AppRole.SUPPORT_AGENT,
];

export const FINANCIAL_OPS_PRACTITIONER_ALLOWED_ROLES: AppRole[] = [
  AppRole.PRACTITIONER,
];

export type WalletViewModel = {
  currency: string;
  pendingBalance: string;
  availableBalance: string;
  reservedBalance: string;
  totalEarned: string;
  lifetimePaidOut: string;
  lastLedgerEntryAt: string | null;
  updatedAt: string | null;
};

export type PractitionerPayoutDestinationSnapshotViewModel = {
  methodType: PractitionerPayoutMethodType | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  iban: string | null;
  walletProvider: string | null;
  walletIdentifier: string | null;
  otherDetails: string | null;
};

export type LedgerEntryViewModel = {
  id: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amount: string;
  currency: string;
  balanceBucket: WalletBalanceBucket;
  paymentId: string | null;
  sessionId: string | null;
  settlementId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
  effectiveAt: string;
};

export type SettlementBatchListItemViewModel = {
  id: string;
  slug: string;
  status: SettlementBatchStatus;
  currency: string;
  periodYear: number;
  periodMonth: number;
  totalAmount: string;
  settlementItemsCount: number;
  generatedAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
};

export type PractitionerSettlementViewModel = {
  id: string;
  batchId: string;
  batchSlug: string;
  batchPeriodYear: number;
  batchPeriodMonth: number;
  batchStatus: SettlementBatchStatus;
  practitionerId: string;
  status: PractitionerSettlementStatus;
  currency: string;
  amountGross: string;
  amountAdjustments: string;
  amountNet: string;
  payoutMethodSnapshot: Record<string, unknown> | null;
  externalPayoutRef: string | null;
  paidAt: string | null;
  failedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type SettlementPayoutViewModel = {
  id: string;
  batchId: string;
  batchSlug: string;
  batchPeriodYear: number;
  batchPeriodMonth: number;
  batchStatus: SettlementBatchStatus;
  settlementId: string;
  practitionerId: string;
  amountNet: string;
  currency: string;
  payoutMethod: SettlementPayoutMethod;
  payoutSource: SettlementPayoutSource;
  externalPayoutRef: string | null;
  notes: string | null;
  effectiveAt: string;
  processedByUserId: string | null;
  processedByDisplayName: string | null;
  proof: SettlementPayoutProofViewModel | null;
  createdAt: string;
};

export type SettlementPayoutProofViewModel = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileName: string | null;
  uploadedAt: string;
  downloadUrl: string;
};

export type PractitionerPayoutDueViewModel = {
  id: string;
  practitionerId: string;
  status: PractitionerSettlementStatus;
  currency: string;
  amountGross: string;
  amountAdjustments: string;
  amountNet: string;
  amountPaidTotal: string;
  amountRemaining: string;
  externalPayoutRef: string | null;
  paidAt: string | null;
  failedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type PractitionerPayoutDueSummaryViewModel = {
  currency: string;
  dueCount: number;
  dueAmountNet: string;
  lastDueAt: string | null;
  walletAvailableBalance: string | null;
  walletReservedBalance: string | null;
  walletPendingBalance: string | null;
  walletUpdatedAt: string | null;
};

export type PractitionerPayoutHistoryViewModel = {
  id: string;
  practitionerId: string;
  settlementId: string;
  amountPaid: string;
  currency: string;
  payoutMethod: SettlementPayoutMethod;
  payoutSource: SettlementPayoutSource;
  payoutDate: string;
  externalReference: string | null;
  notes: string | null;
  processedByUserId: string | null;
  processedByDisplayName: string | null;
  proof: SettlementPayoutProofViewModel | null;
  createdAt: string;
};

export type AdminPayoutHistoryViewModel = PractitionerPayoutHistoryViewModel & {
  practitionerDisplayName: string | null;
  practitionerSlug: string | null;
};

export type PractitionerPayoutDetailViewModel =
  PractitionerPayoutHistoryViewModel & {
    settlement: PractitionerPayoutDueViewModel;
  };

export type PractitionerStatementRowTypeViewModel = 'EARNING' | 'PAYOUT';

export type PractitionerStatementRowViewModel = {
  id: string;
  rowType: PractitionerStatementRowTypeViewModel;
  sourceType: 'LEDGER' | 'PAYOUT';
  effectiveAt: string;
  createdAt: string;
  currency: string;
  amount: string;
  paymentId: string | null;
  sessionId: string | null;
  settlementId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  payoutMethod: SettlementPayoutMethod | null;
  payoutSource: SettlementPayoutSource | null;
  externalReference: string | null;
  notes: string | null;
  processedByUserId: string | null;
  processedByDisplayName: string | null;
  proofPresent: boolean;
};

export type PractitionerStatementCurrencySummaryViewModel = {
  currency: string;
  rowCount: number;
  earningRowsCount: number;
  payoutRowsCount: number;
  earningTotal: string;
  payoutTotal: string;
  netTotal: string;
};

export type PractitionerStatementWalletViewModel = {
  currency: string;
  availableBalance: string;
  pendingBalance: string;
  reservedBalance: string;
  totalEarned: string;
  lifetimePaidOut: string;
  lastLedgerEntryAt: string | null;
  updatedAt: string | null;
};

export type PractitionerStatementSummaryViewModel = {
  rowCount: number;
  earningRowsCount: number;
  payoutRowsCount: number;
  earningTotal: string;
  payoutTotal: string;
  netTotal: string;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  currencySummaries: PractitionerStatementCurrencySummaryViewModel[];
  walletSummaries: PractitionerStatementWalletViewModel[];
};

export type PractitionerStatementPractitionerViewModel = {
  id: string;
  displayName: string | null;
  publicSlug: string | null;
  professionalTitle: string | null;
  countryCode: string | null;
};

export type PractitionerStatementViewModel = {
  practitioner: PractitionerStatementPractitionerViewModel;
  generatedAt: string;
  filters: {
    currencyCode: string | null;
    rowType: 'ALL' | PractitionerStatementRowTypeViewModel;
    effectiveFrom: string | null;
    effectiveTo: string | null;
  };
  summary: PractitionerStatementSummaryViewModel;
  rows: PractitionerStatementRowViewModel[];
};

export type SettlementBatchDetailsViewModel =
  SettlementBatchListItemViewModel & {
    items: PractitionerSettlementViewModel[];
    summary: {
      settlementItemsCount: number;
      totalAmountNet: string;
      statusCounts: {
        draft: number;
        ready: number;
        processing: number;
        paid: number;
        failed: number;
        cancelled: number;
      };
    };
  };

export type PackageSettlementViewModel = {
  id: string;
  purchaseId: string;
  purchaseStatus: PatientPackagePurchaseStatus;
  practitionerId: string;
  practitionerDisplayName: string | null;
  practitionerSlug: string | null;
  patientId: string;
  patientDisplayName: string | null;
  packagePlanCode: string | null;
  packagePlanTitle: string | null;
  currency: string;
  status: PackageSettlementStatus;
  sessionCount: number;
  completedSessionsCount: number;
  heldPractitionerAmount: string;
  heldPlatformAmount: string;
  releasablePractitionerAmount: string;
  releasedPractitionerAmount: string;
  normalEquivalentUsedAmount: string;
  discountAppliedAmount: string;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  releasedAt: string | null;
  releasedByAdminId: string | null;
  decision: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PractitionerPayoutBalanceViewModel = {
  practitionerId: string;
  practitionerName: string | null;
  currencyCode: string;
  payoutDestinationSnapshot: PractitionerPayoutDestinationSnapshotViewModel | null;
  payoutDestinationType: string | null;
  payoutDestinationSummaryMasked: string | null;
  normalSessionPayableAmount: string;
  packageReleasedPayableAmount: string;
  packageHeldAmount: string;
  totalPayableAmount: string;
  lastPayoutAt: string | null;
};

export type PractitionerManualPayoutSummaryViewModel = {
  practitionerId: string;
  practitionerName: string | null;
  practitionerSlug: string | null;
  safeDisplayCode: string;
  avatarUrl: string | null;
  primarySpecialtyName: string | null;
  payoutDestinationType: string | null;
  payoutDestinationSummaryMasked: string | null;
  egp: PractitionerPayoutBalanceViewModel;
  usd: PractitionerPayoutBalanceViewModel;
  hasPayable: boolean;
  hasPackage: boolean;
  lastPayoutAt: string | null;
};

export type PractitionerManualPayoutViewModel = {
  id: string;
  practitionerId: string;
  practitionerName: string | null;
  currencyCode: string;
  amountPaid: string;
  normalSessionAppliedAmount: string;
  packageReleasedAppliedAmount: string;
  packageHeldAmountSnapshot: string;
  totalPayableSnapshot: string;
  payoutMethod: SettlementPayoutMethod;
  transferReference: string | null;
  paidAt: string;
  notes: string | null;
  recordedByUserId: string | null;
  recordedByDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
};
