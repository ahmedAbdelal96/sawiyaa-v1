import { ApiProperty } from '@nestjs/swagger';
import {
  LedgerDirection,
  LedgerEntryType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerSettlementStatus,
  SettlementPayoutMethod,
  SettlementPayoutSource,
  RefundStatus,
  SettlementBatchStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import {
  FinanceOperationSortByDto,
  FinanceOperationSortOrderDto,
  FinanceOperationTypeDto,
} from './list-finance-operation-events.dto';
import { PractitionerPayoutDestinationResponseDto } from '@modules/practitioners/dto/practitioner-payout-destination.dto';

export class WalletItemDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  pendingBalance!: string;

  @ApiProperty()
  availableBalance!: string;

  @ApiProperty()
  reservedBalance!: string;

  @ApiProperty()
  totalEarned!: string;

  @ApiProperty()
  lifetimePaidOut!: string;

  @ApiProperty({ nullable: true })
  lastLedgerEntryAt!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class LedgerEntryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: LedgerEntryType })
  entryType!: LedgerEntryType;

  @ApiProperty({ enum: LedgerDirection })
  direction!: LedgerDirection;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: WalletBalanceBucket })
  balanceBucket!: WalletBalanceBucket;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ nullable: true })
  sessionId!: string | null;

  @ApiProperty({ nullable: true })
  settlementId!: string | null;

  @ApiProperty({ nullable: true })
  referenceType!: string | null;

  @ApiProperty({ nullable: true })
  referenceId!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  effectiveAt!: string;
}

export class PaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PractitionerSettlementItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  batchId!: string;

  @ApiProperty()
  batchSlug!: string;

  @ApiProperty()
  batchPeriodYear!: number;

  @ApiProperty()
  batchPeriodMonth!: number;

  @ApiProperty({ enum: SettlementBatchStatus })
  batchStatus!: SettlementBatchStatus;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty({ enum: PractitionerSettlementStatus })
  status!: PractitionerSettlementStatus;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  amountGross!: string;

  @ApiProperty()
  amountAdjustments!: string;

  @ApiProperty()
  amountNet!: string;

  @ApiProperty({ nullable: true })
  payoutMethodSnapshot!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  externalPayoutRef!: string | null;

  @ApiProperty({ nullable: true })
  paidAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class SettlementBatchListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: SettlementBatchStatus })
  status!: SettlementBatchStatus;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  periodYear!: number;

  @ApiProperty()
  periodMonth!: number;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  settlementItemsCount!: number;

  @ApiProperty({ nullable: true })
  generatedAt!: string | null;

  @ApiProperty({ nullable: true })
  finalizedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class SettlementBatchStatusCountsDto {
  @ApiProperty()
  draft!: number;

  @ApiProperty()
  ready!: number;

  @ApiProperty()
  processing!: number;

  @ApiProperty()
  paid!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  cancelled!: number;
}

export class SettlementBatchOperationalSummaryDto {
  @ApiProperty()
  settlementItemsCount!: number;

  @ApiProperty()
  totalAmountNet!: string;

  @ApiProperty({ type: SettlementBatchStatusCountsDto })
  statusCounts!: SettlementBatchStatusCountsDto;
}

export class SettlementBatchDetailsDto extends SettlementBatchListItemDto {
  @ApiProperty({ type: PractitionerSettlementItemDto, isArray: true })
  items!: PractitionerSettlementItemDto[];

  @ApiProperty({ type: SettlementBatchOperationalSummaryDto })
  summary!: SettlementBatchOperationalSummaryDto;
}

export class SettlementPayoutRecordItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  batchId!: string;

  @ApiProperty()
  batchSlug!: string;

  @ApiProperty()
  batchPeriodYear!: number;

  @ApiProperty()
  batchPeriodMonth!: number;

  @ApiProperty({ enum: SettlementBatchStatus })
  batchStatus!: SettlementBatchStatus;

  @ApiProperty()
  settlementId!: string;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty()
  amountNet!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: SettlementPayoutMethod })
  payoutMethod!: SettlementPayoutMethod;

  @ApiProperty({ enum: SettlementPayoutSource })
  payoutSource!: SettlementPayoutSource;

  @ApiProperty({ nullable: true })
  externalPayoutRef!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  effectiveAt!: string;

  @ApiProperty({ nullable: true })
  processedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  processedByDisplayName!: string | null;

  @ApiProperty({ nullable: true })
  proof!: SettlementPayoutProofDto | null;

  @ApiProperty()
  createdAt!: string;
}

export class SettlementPayoutProofDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  fileSizeBytes!: number;

  @ApiProperty({ nullable: true })
  originalFileName!: string | null;

  @ApiProperty()
  uploadedAt!: string;

  @ApiProperty()
  downloadUrl!: string;
}

export class PractitionerPayoutDueItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty({ enum: PractitionerSettlementStatus })
  status!: PractitionerSettlementStatus;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  amountGross!: string;

  @ApiProperty()
  amountAdjustments!: string;

  @ApiProperty()
  amountNet!: string;

  @ApiProperty()
  amountPaidTotal!: string;

  @ApiProperty()
  amountRemaining!: string;

  @ApiProperty({ nullable: true })
  externalPayoutRef!: string | null;

  @ApiProperty({ nullable: true })
  paidAt!: string | null;

  @ApiProperty({ nullable: true })
  failedAt!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class PractitionerPayoutDueSummaryDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  dueCount!: number;

  @ApiProperty()
  dueAmountNet!: string;

  @ApiProperty({ nullable: true })
  lastDueAt!: string | null;

  @ApiProperty({ nullable: true })
  walletAvailableBalance!: string | null;

  @ApiProperty({ nullable: true })
  walletReservedBalance!: string | null;

  @ApiProperty({ nullable: true })
  walletPendingBalance!: string | null;

  @ApiProperty({ nullable: true })
  walletUpdatedAt!: string | null;
}

export class PractitionerPayoutDueListDataResponseDto {
  @ApiProperty({ type: PractitionerPayoutDueItemDto, isArray: true })
  items!: PractitionerPayoutDueItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;

  @ApiProperty({ type: PractitionerPayoutDueSummaryDto, isArray: true })
  summaries!: PractitionerPayoutDueSummaryDto[];
}

export class PractitionerPayoutDueListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerPayoutDueListDataResponseDto })
  data!: PractitionerPayoutDueListDataResponseDto;
}

export class SettlementDuesDirectoryPractitionerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty()
  practitionerType!: string;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty()
  isVerified!: boolean;
}

export class SettlementDuesDirectoryStatsDto {
  @ApiProperty()
  visibleCount!: number;

  @ApiProperty()
  withDueCount!: number;

  @ApiProperty()
  withBalanceCount!: number;

  @ApiProperty()
  verifiedCount!: number;
}

export class SettlementDuesDirectoryItemDto {
  @ApiProperty({ type: SettlementDuesDirectoryPractitionerDto })
  practitioner!: SettlementDuesDirectoryPractitionerDto;

  @ApiProperty({ type: PractitionerPayoutDueSummaryDto, isArray: true })
  summaries!: PractitionerPayoutDueSummaryDto[];
}

export class SettlementDuesDirectoryListDataResponseDto {
  @ApiProperty({ type: SettlementDuesDirectoryItemDto, isArray: true })
  items!: SettlementDuesDirectoryItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;

  @ApiProperty({ type: SettlementDuesDirectoryStatsDto })
  stats!: SettlementDuesDirectoryStatsDto;
}

export class SettlementDuesDirectoryListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SettlementDuesDirectoryListDataResponseDto })
  data!: SettlementDuesDirectoryListDataResponseDto;
}

export class PractitionerPayoutHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty()
  settlementId!: string;

  @ApiProperty()
  amountPaid!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: SettlementPayoutMethod })
  payoutMethod!: SettlementPayoutMethod;

  @ApiProperty({ enum: SettlementPayoutSource })
  payoutSource!: SettlementPayoutSource;

  @ApiProperty()
  payoutDate!: string;

  @ApiProperty({ nullable: true })
  externalReference!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty({ nullable: true })
  processedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  processedByDisplayName!: string | null;

  @ApiProperty({ nullable: true })
  proof!: SettlementPayoutProofDto | null;

  @ApiProperty()
  createdAt!: string;
}

export class AdminPayoutHistoryItemDto extends PractitionerPayoutHistoryItemDto {
  @ApiProperty({ nullable: true })
  practitionerDisplayName!: string | null;

  @ApiProperty({ nullable: true })
  practitionerSlug!: string | null;
}

export class AdminPayoutHistoryListDataResponseDto {
  @ApiProperty({ type: AdminPayoutHistoryItemDto, isArray: true })
  items!: AdminPayoutHistoryItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class AdminPayoutHistoryListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminPayoutHistoryListDataResponseDto })
  data!: AdminPayoutHistoryListDataResponseDto;
}

export class PractitionerPayoutHistoryListDataResponseDto {
  @ApiProperty({ type: PractitionerPayoutHistoryItemDto, isArray: true })
  items!: PractitionerPayoutHistoryItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class PractitionerPayoutHistoryListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerPayoutHistoryListDataResponseDto })
  data!: PractitionerPayoutHistoryListDataResponseDto;
}

export class PractitionerPayoutDetailDataResponseDto {
  @ApiProperty({ type: PractitionerPayoutHistoryItemDto })
  item!: PractitionerPayoutHistoryItemDto;
}

export class PractitionerPayoutDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerPayoutDetailDataResponseDto })
  data!: PractitionerPayoutDetailDataResponseDto;
}

export class PractitionerStatementRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['EARNING', 'PAYOUT'] })
  rowType!: 'EARNING' | 'PAYOUT';

  @ApiProperty({ enum: ['LEDGER', 'PAYOUT'] })
  sourceType!: 'LEDGER' | 'PAYOUT';

  @ApiProperty()
  effectiveAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ nullable: true })
  sessionId!: string | null;

  @ApiProperty({ nullable: true })
  settlementId!: string | null;

  @ApiProperty({ nullable: true })
  referenceType!: string | null;

  @ApiProperty({ nullable: true })
  referenceId!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: SettlementPayoutMethod, nullable: true })
  payoutMethod!: SettlementPayoutMethod | null;

  @ApiProperty({ enum: SettlementPayoutSource, nullable: true })
  payoutSource!: SettlementPayoutSource | null;

  @ApiProperty({ nullable: true })
  externalReference!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty({ nullable: true })
  processedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  processedByDisplayName!: string | null;

  @ApiProperty()
  proofPresent!: boolean;
}

export class PractitionerStatementCurrencySummaryDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  rowCount!: number;

  @ApiProperty()
  earningRowsCount!: number;

  @ApiProperty()
  payoutRowsCount!: number;

  @ApiProperty()
  earningTotal!: string;

  @ApiProperty()
  payoutTotal!: string;

  @ApiProperty()
  netTotal!: string;
}

export class PractitionerStatementWalletDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  availableBalance!: string;

  @ApiProperty()
  pendingBalance!: string;

  @ApiProperty()
  reservedBalance!: string;

  @ApiProperty()
  totalEarned!: string;

  @ApiProperty()
  lifetimePaidOut!: string;

  @ApiProperty({ nullable: true })
  lastLedgerEntryAt!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class PractitionerStatementSummaryDto {
  @ApiProperty()
  rowCount!: number;

  @ApiProperty()
  earningRowsCount!: number;

  @ApiProperty()
  payoutRowsCount!: number;

  @ApiProperty()
  earningTotal!: string;

  @ApiProperty()
  payoutTotal!: string;

  @ApiProperty()
  netTotal!: string;

  @ApiProperty({ nullable: true })
  firstActivityAt!: string | null;

  @ApiProperty({ nullable: true })
  lastActivityAt!: string | null;

  @ApiProperty({ type: PractitionerStatementCurrencySummaryDto, isArray: true })
  currencySummaries!: PractitionerStatementCurrencySummaryDto[];

  @ApiProperty({ type: PractitionerStatementWalletDto, isArray: true })
  walletSummaries!: PractitionerStatementWalletDto[];
}

export class PractitionerStatementPractitionerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  publicSlug!: string | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;
}

export class PractitionerStatementDataResponseDto {
  @ApiProperty({ type: PractitionerStatementPractitionerDto })
  practitioner!: PractitionerStatementPractitionerDto;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({
    type: 'object',
    properties: {
      currencyCode: { type: 'string', nullable: true },
      rowType: { type: 'string' },
      effectiveFrom: { type: 'string', nullable: true },
      effectiveTo: { type: 'string', nullable: true },
    },
  })
  filters!: {
    currencyCode: string | null;
    rowType: 'ALL' | 'EARNING' | 'PAYOUT';
    effectiveFrom: string | null;
    effectiveTo: string | null;
  };

  @ApiProperty({ type: PractitionerStatementSummaryDto })
  summary!: PractitionerStatementSummaryDto;

  @ApiProperty({ type: PractitionerStatementRowDto, isArray: true })
  rows!: PractitionerStatementRowDto[];
}

export class PractitionerStatementSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerStatementDataResponseDto })
  data!: PractitionerStatementDataResponseDto;
}

export class PractitionerPayoutCreateDataResponseDto {
  @ApiProperty({ type: PractitionerPayoutDetailDataResponseDto })
  item!: PractitionerPayoutDetailDataResponseDto;
}

export class PractitionerPayoutCreateSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerPayoutCreateDataResponseDto })
  data!: PractitionerPayoutCreateDataResponseDto;
}

export class PractitionerPayoutProofUploadDataResponseDto {
  @ApiProperty({ type: PractitionerPayoutDetailDataResponseDto })
  item!: PractitionerPayoutDetailDataResponseDto;
}

export class PractitionerPayoutProofUploadSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerPayoutProofUploadDataResponseDto })
  data!: PractitionerPayoutProofUploadDataResponseDto;
}

export class FinanceOperationEventItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: FinanceOperationTypeDto })
  operationType!: FinanceOperationTypeDto;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ nullable: true })
  refundId!: string | null;

  @ApiProperty({ enum: PaymentProvider, nullable: true })
  provider!: PaymentProvider | null;

  @ApiProperty({ enum: PaymentPurpose, nullable: true })
  paymentPurpose!: PaymentPurpose | null;

  @ApiProperty({ enum: PaymentStatus, nullable: true })
  paymentStatus!: PaymentStatus | null;

  @ApiProperty({ enum: RefundStatus, nullable: true })
  refundStatus!: RefundStatus | null;

  @ApiProperty({ nullable: true })
  externalRef!: string | null;

  @ApiProperty({ nullable: true })
  summary!: string | null;

  @ApiProperty({ nullable: true })
  linkedSessionId!: string | null;

  @ApiProperty({ nullable: true })
  linkedPatientId!: string | null;

  @ApiProperty({ nullable: true })
  linkedPractitionerId!: string | null;

  @ApiProperty({ nullable: true })
  patientDisplayName!: string | null;

  @ApiProperty({ nullable: true })
  practitionerDisplayName!: string | null;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  createdAt!: string;
}

export class FinanceOperationEventFiltersDto {
  @ApiProperty({ enum: FinanceOperationSortByDto })
  sortBy!: FinanceOperationSortByDto;

  @ApiProperty({ enum: FinanceOperationSortOrderDto })
  sortOrder!: FinanceOperationSortOrderDto;

  @ApiProperty({ nullable: true })
  operationType!: FinanceOperationTypeDto | null;

  @ApiProperty({ nullable: true })
  provider!: string | null;

  @ApiProperty({ nullable: true })
  paymentPurpose!: string | null;

  @ApiProperty({ nullable: true })
  paymentStatus!: string | null;

  @ApiProperty({ nullable: true })
  refundStatus!: string | null;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ nullable: true })
  refundId!: string | null;

  @ApiProperty({ nullable: true })
  occurredFrom!: string | null;

  @ApiProperty({ nullable: true })
  occurredTo!: string | null;

  @ApiProperty({ nullable: true })
  query!: string | null;
}

export class WalletItemDataResponseDto {
  @ApiProperty({ type: WalletItemDto })
  item!: WalletItemDto;
}

export class LedgerListDataResponseDto {
  @ApiProperty({ type: LedgerEntryItemDto, isArray: true })
  items!: LedgerEntryItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class PractitionerSettlementListDataResponseDto {
  @ApiProperty({ type: PractitionerSettlementItemDto, isArray: true })
  items!: PractitionerSettlementItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class SettlementBatchListDataResponseDto {
  @ApiProperty({ type: SettlementBatchListItemDto, isArray: true })
  items!: SettlementBatchListItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class SettlementBatchItemDataResponseDto {
  @ApiProperty({ type: SettlementBatchDetailsDto })
  item!: SettlementBatchDetailsDto;
}

export class FinanceOperationEventListDataResponseDto {
  @ApiProperty({ type: FinanceOperationEventItemDto, isArray: true })
  items!: FinanceOperationEventItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;

  @ApiProperty({ type: FinanceOperationEventFiltersDto })
  filters!: FinanceOperationEventFiltersDto;
}

export class FinanceOperationEventItemDataResponseDto {
  @ApiProperty({ type: FinanceOperationEventItemDto })
  item!: FinanceOperationEventItemDto;
}

export class PractitionerManualPayoutBalanceDto {
  @ApiProperty()
  practitionerId!: string;

  @ApiProperty({ nullable: true })
  practitionerName!: string | null;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({
    type: PractitionerPayoutDestinationResponseDto,
    nullable: true,
  })
  payoutDestinationSnapshot!: PractitionerPayoutDestinationResponseDto | null;

  @ApiProperty()
  normalSessionPayableAmount!: string;

  @ApiProperty()
  packageReleasedPayableAmount!: string;

  @ApiProperty()
  packageHeldAmount!: string;

  @ApiProperty()
  totalPayableAmount!: string;

  @ApiProperty({ nullable: true })
  lastPayoutAt!: string | null;
}

export class PractitionerManualPayoutSummaryItemDto {
  @ApiProperty()
  practitionerId!: string;

  @ApiProperty({ nullable: true })
  practitionerName!: string | null;

  @ApiProperty({ nullable: true })
  practitionerSlug!: string | null;

  @ApiProperty()
  safeDisplayCode!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  primarySpecialtyName!: string | null;

  @ApiProperty({ nullable: true })
  payoutDestinationType!: string | null;

  @ApiProperty({ nullable: true })
  payoutDestinationSummaryMasked!: string | null;

  @ApiProperty({ type: PractitionerManualPayoutBalanceDto })
  egp!: PractitionerManualPayoutBalanceDto;

  @ApiProperty({ type: PractitionerManualPayoutBalanceDto })
  usd!: PractitionerManualPayoutBalanceDto;

  @ApiProperty()
  hasPayable!: boolean;

  @ApiProperty()
  hasPackage!: boolean;

  @ApiProperty({ nullable: true })
  lastPayoutAt!: string | null;
}

export class PractitionerManualPayoutItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty({ nullable: true })
  practitionerName!: string | null;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  amountPaid!: string;

  @ApiProperty()
  normalSessionAppliedAmount!: string;

  @ApiProperty()
  packageReleasedAppliedAmount!: string;

  @ApiProperty()
  packageHeldAmountSnapshot!: string;

  @ApiProperty()
  totalPayableSnapshot!: string;

  @ApiProperty({ enum: SettlementPayoutMethod })
  payoutMethod!: SettlementPayoutMethod;

  @ApiProperty({ nullable: true })
  transferReference!: string | null;

  @ApiProperty()
  paidAt!: string;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty({ nullable: true })
  recordedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  recordedByDisplayName!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PractitionerManualPayoutBalanceDataResponseDto {
  @ApiProperty({ type: PractitionerManualPayoutBalanceDto })
  item!: PractitionerManualPayoutBalanceDto;
}

export class PractitionerManualPayoutListDataResponseDto {
  @ApiProperty({ type: PractitionerManualPayoutItemDto, isArray: true })
  items!: PractitionerManualPayoutItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class PractitionerManualPayoutItemDataResponseDto {
  @ApiProperty({ type: PractitionerManualPayoutItemDto })
  item!: PractitionerManualPayoutItemDto;
}

export class WalletItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: WalletItemDataResponseDto })
  data!: WalletItemDataResponseDto;
}

export class LedgerListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: LedgerListDataResponseDto })
  data!: LedgerListDataResponseDto;
}

export class PractitionerSettlementListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerSettlementListDataResponseDto })
  data!: PractitionerSettlementListDataResponseDto;
}

export class SettlementBatchListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SettlementBatchListDataResponseDto })
  data!: SettlementBatchListDataResponseDto;
}

export class SettlementBatchItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SettlementBatchItemDataResponseDto })
  data!: SettlementBatchItemDataResponseDto;
}

export class SettlementPayoutListDataResponseDto {
  @ApiProperty({ type: SettlementPayoutRecordItemDto, isArray: true })
  items!: SettlementPayoutRecordItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class SettlementPayoutListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SettlementPayoutListDataResponseDto })
  data!: SettlementPayoutListDataResponseDto;
}

export class SettlementPayoutItemDataResponseDto {
  @ApiProperty({ type: SettlementPayoutRecordItemDto })
  item!: SettlementPayoutRecordItemDto;
}

export class SettlementPayoutItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SettlementPayoutItemDataResponseDto })
  data!: SettlementPayoutItemDataResponseDto;
}

export class FinanceOperationEventListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: FinanceOperationEventListDataResponseDto })
  data!: FinanceOperationEventListDataResponseDto;
}

export class FinanceOperationEventItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: FinanceOperationEventItemDataResponseDto })
  data!: FinanceOperationEventItemDataResponseDto;
}

export class PractitionerManualPayoutBalanceSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerManualPayoutBalanceDataResponseDto })
  data!: PractitionerManualPayoutBalanceDataResponseDto;
}

export class PractitionerManualPayoutListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerManualPayoutListDataResponseDto })
  data!: PractitionerManualPayoutListDataResponseDto;
}

export class PractitionerManualPayoutItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerManualPayoutItemDataResponseDto })
  data!: PractitionerManualPayoutItemDataResponseDto;
}

export class PractitionerManualPayoutSummaryListDataResponseDto {
  @ApiProperty({ type: PractitionerManualPayoutSummaryItemDto, isArray: true })
  items!: PractitionerManualPayoutSummaryItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class PractitionerManualPayoutSummaryListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerManualPayoutSummaryListDataResponseDto })
  data!: PractitionerManualPayoutSummaryListDataResponseDto;
}
