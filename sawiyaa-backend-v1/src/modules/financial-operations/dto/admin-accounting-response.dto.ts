import { ApiProperty } from '@nestjs/swagger';
import {
  JournalEntrySourceType,
  LedgerDirection,
  ReconciliationReviewStatus,
} from '@prisma/client';
import { PaginationDto } from './financial-operations-response.dto';

export class AccountingKpiSnapshotDto {
  @ApiProperty()
  grossInflow!: string;

  @ApiProperty()
  platformRevenue!: string;

  @ApiProperty()
  practitionerPayableOutstanding!: string;

  @ApiProperty()
  refundsTotal!: string;

  @ApiProperty()
  vatTotal!: string;

  @ApiProperty()
  feesTotal!: string;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;
}

export class AccountingTrendPointDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  revenue!: string;

  @ApiProperty()
  payableIncrements!: string;

  @ApiProperty()
  payouts!: string;

  @ApiProperty()
  refunds!: string;

  @ApiProperty()
  fees!: string;
}

export class AccountingRecentEventItemDto {
  @ApiProperty()
  journalEntryId!: string;

  @ApiProperty({ enum: JournalEntrySourceType })
  sourceType!: JournalEntrySourceType;

  @ApiProperty()
  sourceId!: string;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  summary!: string;
}

export class AccountingDashboardDataResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({
    type: 'object',
    properties: {
      from: { type: 'string' },
      to: { type: 'string' },
    },
  })
  range!: {
    from: string;
    to: string;
  };

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ type: AccountingKpiSnapshotDto })
  kpis!: AccountingKpiSnapshotDto;

  @ApiProperty({ type: AccountingTrendPointDto, isArray: true })
  trends!: AccountingTrendPointDto[];

  @ApiProperty({ type: AccountingRecentEventItemDto, isArray: true })
  recentEvents!: AccountingRecentEventItemDto[];
}

export class AccountingDashboardSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AccountingDashboardDataResponseDto })
  data!: AccountingDashboardDataResponseDto;
}

export class LedgerExplorerAccountFilterOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  accountType!: string;

  @ApiProperty()
  scope!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ nullable: true })
  practitionerId!: string | null;
}

export class LedgerExplorerRowItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  journalEntryId!: string;

  @ApiProperty({ enum: JournalEntrySourceType })
  sourceType!: JournalEntrySourceType;

  @ApiProperty()
  sourceId!: string;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  ledgerAccountId!: string;

  @ApiProperty()
  ledgerAccountCode!: string;

  @ApiProperty()
  ledgerAccountName!: string;

  @ApiProperty()
  ledgerAccountScope!: string;

  @ApiProperty({ nullable: true })
  practitionerId!: string | null;

  @ApiProperty({ enum: LedgerDirection })
  direction!: LedgerDirection;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ nullable: true })
  memo!: string | null;

  @ApiProperty({ nullable: true })
  referenceType!: string | null;

  @ApiProperty({ nullable: true })
  referenceId!: string | null;
}

export class LedgerExplorerFiltersDto {
  @ApiProperty({ nullable: true })
  from!: string | null;

  @ApiProperty({ nullable: true })
  to!: string | null;

  @ApiProperty({ nullable: true })
  ledgerAccountId!: string | null;

  @ApiProperty({ enum: JournalEntrySourceType, nullable: true })
  sourceType!: JournalEntrySourceType | null;

  @ApiProperty({ nullable: true })
  practitionerId!: string | null;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ nullable: true })
  journalEntryId!: string | null;

  @ApiProperty({ nullable: true })
  query!: string | null;
}

export class LedgerExplorerListDataResponseDto {
  @ApiProperty({ type: LedgerExplorerRowItemDto, isArray: true })
  items!: LedgerExplorerRowItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;

  @ApiProperty({ type: LedgerExplorerFiltersDto })
  filters!: LedgerExplorerFiltersDto;
}

export class LedgerExplorerListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: LedgerExplorerListDataResponseDto })
  data!: LedgerExplorerListDataResponseDto;
}

export class LedgerExplorerAccountOptionsDataResponseDto {
  @ApiProperty({ type: LedgerExplorerAccountFilterOptionDto, isArray: true })
  items!: LedgerExplorerAccountFilterOptionDto[];
}

export class LedgerExplorerAccountOptionsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: LedgerExplorerAccountOptionsDataResponseDto })
  data!: LedgerExplorerAccountOptionsDataResponseDto;
}

export class JournalEntryDetailDataResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'string' },
      sourceType: { type: 'string' },
      sourceId: { type: 'string' },
      occurredAt: { type: 'string' },
      createdAt: { type: 'string' },
      currencyCode: { type: 'string' },
      description: { type: 'string', nullable: true },
      lines: {
        type: 'array',
        items: { $ref: '#/components/schemas/LedgerExplorerRowItemDto' },
      },
    },
  })
  item!: {
    id: string;
    sourceType: JournalEntrySourceType;
    sourceId: string;
    occurredAt: string;
    createdAt: string;
    currencyCode: string;
    description: string | null;
    lines: LedgerExplorerRowItemDto[];
  };
}

export class JournalEntryDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: JournalEntryDetailDataResponseDto })
  data!: JournalEntryDetailDataResponseDto;
}

export class AccountingReconciliationAnomalyDto {
  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: ['INFO', 'WARNING', 'CRITICAL'] })
  level!: 'INFO' | 'WARNING' | 'CRITICAL';

  @ApiProperty()
  message!: string;
}

export class AccountingReconciliationItemDto {
  @ApiProperty({ enum: JournalEntrySourceType })
  sourceType!: JournalEntrySourceType;

  @ApiProperty()
  sourceId!: string;

  @ApiProperty({ nullable: true })
  practitionerId!: string | null;

  @ApiProperty({ nullable: true })
  paymentId!: string | null;

  @ApiProperty({ nullable: true })
  refundId!: string | null;

  @ApiProperty({ nullable: true })
  settlementId!: string | null;

  @ApiProperty({ nullable: true })
  payoutId!: string | null;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  operationalAmount!: string;

  @ApiProperty({ nullable: true })
  journalEntryId!: string | null;

  @ApiProperty({ nullable: true })
  journalOccurredAt!: string | null;

  @ApiProperty({ nullable: true })
  journalAmount!: string | null;

  @ApiProperty({ nullable: true })
  proofPresent!: boolean | null;

  @ApiProperty({
    enum: ['MATCHED', 'MISMATCH', 'MISSING_PROOF', 'REQUIRES_ADJUSTMENT'],
  })
  systemStatus!:
    | 'MATCHED'
    | 'MISMATCH'
    | 'MISSING_PROOF'
    | 'REQUIRES_ADJUSTMENT';

  @ApiProperty({ enum: ReconciliationReviewStatus, nullable: true })
  reviewStatus!: ReconciliationReviewStatus | null;

  @ApiProperty({ enum: ReconciliationReviewStatus })
  effectiveStatus!: ReconciliationReviewStatus;

  @ApiProperty({ nullable: true })
  reviewNote!: string | null;

  @ApiProperty({ nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ nullable: true })
  reviewedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  reviewedByDisplayName!: string | null;

  @ApiProperty({ type: AccountingReconciliationAnomalyDto, isArray: true })
  anomalies!: AccountingReconciliationAnomalyDto[];
}

export class AccountingReconciliationFiltersDto {
  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ enum: JournalEntrySourceType, nullable: true })
  sourceType!: JournalEntrySourceType | null;

  @ApiProperty({ nullable: true })
  practitionerId!: string | null;

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ enum: ReconciliationReviewStatus, nullable: true })
  status!: ReconciliationReviewStatus | null;

  @ApiProperty({ nullable: true })
  query!: string | null;

  @ApiProperty({ nullable: true })
  anomalyCode!: string | null;
}

export class AccountingReconciliationListDataResponseDto {
  @ApiProperty({ type: AccountingReconciliationItemDto, isArray: true })
  items!: AccountingReconciliationItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;

  @ApiProperty({ type: AccountingReconciliationFiltersDto })
  filters!: AccountingReconciliationFiltersDto;
}

export class AccountingReconciliationListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AccountingReconciliationListDataResponseDto })
  data!: AccountingReconciliationListDataResponseDto;
}

export class AccountingReconciliationOverviewTotalsDto {
  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  matched!: number;

  @ApiProperty()
  pendingReview!: number;

  @ApiProperty()
  mismatch!: number;

  @ApiProperty()
  missingProof!: number;

  @ApiProperty()
  requiresAdjustment!: number;

  @ApiProperty()
  resolved!: number;
}

export class AccountingReconciliationOverviewAnomalyDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  count!: number;
}

export class AccountingReconciliationOverviewDataResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({
    type: 'object',
    properties: {
      from: { type: 'string' },
      to: { type: 'string' },
    },
  })
  range!: {
    from: string;
    to: string;
  };

  @ApiProperty({ nullable: true })
  currencyCode!: string | null;

  @ApiProperty({ type: AccountingReconciliationOverviewTotalsDto })
  totals!: AccountingReconciliationOverviewTotalsDto;

  @ApiProperty({
    type: AccountingReconciliationOverviewAnomalyDto,
    isArray: true,
  })
  anomalies!: AccountingReconciliationOverviewAnomalyDto[];
}

export class AccountingReconciliationOverviewSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AccountingReconciliationOverviewDataResponseDto })
  data!: AccountingReconciliationOverviewDataResponseDto;
}

export class AccountingReconciliationReviewItemDto {
  @ApiProperty({ enum: JournalEntrySourceType })
  sourceType!: JournalEntrySourceType;

  @ApiProperty()
  sourceId!: string;

  @ApiProperty({ enum: ReconciliationReviewStatus })
  status!: ReconciliationReviewStatus;

  @ApiProperty({ nullable: true })
  note!: string | null;

  @ApiProperty({ nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ nullable: true })
  reviewedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  reviewedByDisplayName!: string | null;
}

export class AccountingReconciliationReviewDataResponseDto {
  @ApiProperty({ type: AccountingReconciliationReviewItemDto })
  item!: AccountingReconciliationReviewItemDto;
}

export class AccountingReconciliationReviewSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AccountingReconciliationReviewDataResponseDto })
  data!: AccountingReconciliationReviewDataResponseDto;
}
