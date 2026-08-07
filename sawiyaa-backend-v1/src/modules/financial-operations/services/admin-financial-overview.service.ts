import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CustomerWalletEntryDirection,
  CustomerWalletEntryType,
  LedgerDirection,
  LedgerEntryType,
  PaymentStatus,
  PractitionerEarningAdjustmentType,
  PractitionerSettlementStatus,
  PractitionerWalletStatus,
  Prisma,
  SessionEarningReviewStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  AdminFinancialOverviewDataDto,
  AdminFinancialOverviewQueryDto,
  AdminFinancialOverviewScope,
} from '../dto/admin-financial-overview.dto';

type Query = AdminFinancialOverviewQueryDto;
type AmountRow = { currency: string | null; amount: Prisma.Decimal | null; count: bigint | number };
type BalanceRow = { currency: string; available: Prisma.Decimal | null; pending: Prisma.Decimal | null; reserved: Prisma.Decimal | null; count: bigint | number };

const successfulPayoutStatuses = [PractitionerSettlementStatus.PAID_OUT, PractitionerSettlementStatus.PAID];
const availableForPayoutStatuses = [PractitionerSettlementStatus.READY];
const pendingExternalPayoutStatuses = [PractitionerSettlementStatus.PROCESSING];
@Injectable()
export class AdminFinancialOverviewService {
  private readonly logger = new Logger(AdminFinancialOverviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(query: Query = {}, scope: AdminFinancialOverviewScope = 'ACCOUNTING'): Promise<AdminFinancialOverviewDataDto> {
    const requestId = randomUUID();
    const requestStartedAt = performance.now();
    const normalized = this.normalize(query);
    const aggregationStartedAt = performance.now();
    const metrics = await this.buildMetrics(normalized, scope);
    const aggregationDurationMs = performance.now() - aggregationStartedAt;
    const requestDurationMs = performance.now() - requestStartedAt;
    const resultBucketCount = Object.values(metrics as Record<string, unknown>).reduce<number>((total, value) => total + (Array.isArray(value) ? value.length : 0), 0);
    const filterComplexity = [
      normalized.fromDate, normalized.toDate, normalized.currency, normalized.paymentStatus,
      normalized.reviewStatus, normalized.walletStatus, normalized.payoutStatus,
      normalized.practitionerId, normalized.patientId, normalized.bookingType, normalized.fulfillment,
    ].filter(Boolean).length;
    const performanceEvent = {
      event: 'admin_financial_overview_performance',
      requestId,
      endpoint: scope,
      requestDurationMs: Number(requestDurationMs.toFixed(2)),
      databaseAggregationDurationMs: Number(aggregationDurationMs.toFixed(2)),
      cache: 'not_used',
      filterComplexity,
      resultBucketCount,
    };
    this.logger.debug(JSON.stringify(performanceEvent));
    const slowThresholdMs = Number(process.env.FINANCIAL_OVERVIEW_SLOW_MS ?? 500);
    if (requestDurationMs >= slowThresholdMs) this.logger.warn(JSON.stringify({ ...performanceEvent, thresholdMs: slowThresholdMs }));
    return {
      asOf: new Date().toISOString(),
      filters: {
        fromDate: normalized.fromDate?.toISOString() ?? null,
        toDate: normalized.toDate?.toISOString() ?? null,
        currency: normalized.currency ?? null,
        paymentStatus: normalized.paymentStatus ?? null,
        reviewStatus: normalized.reviewStatus ?? null,
        walletStatus: normalized.walletStatus ?? null,
        payoutStatus: normalized.payoutStatus ?? null,
        practitionerId: normalized.practitionerId ?? null,
        patientId: normalized.patientId ?? null,
        bookingType: normalized.bookingType ?? null,
        fulfillment: normalized.fulfillment ?? null,
      },
      metrics,
    };
  }

  private normalize(query: Query) {
    const fromDate = this.parseDate(query.fromDate, 'fromDate');
    const toDate = this.parseDate(query.toDate, 'toDate');
    if (fromDate && toDate && fromDate >= toDate) throw new BadRequestException('fromDate must be before toDate');
    const currency = query.currency?.trim().toUpperCase() || undefined;
    if (currency && !/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('currency must be a three-letter code');
    const validateEnum = (value: string | undefined, allowed: readonly string[], name: string) => {
      if (value && !allowed.includes(value)) throw new BadRequestException(`Invalid ${name}`);
      return value;
    };
    return {
      ...query,
      fromDate,
      toDate,
      currency,
      paymentStatus: validateEnum(query.paymentStatus, Object.values(PaymentStatus), 'paymentStatus'),
      reviewStatus: validateEnum(query.reviewStatus, Object.values(SessionEarningReviewStatus), 'reviewStatus'),
      walletStatus: validateEnum(query.walletStatus, Object.values(PractitionerWalletStatus), 'walletStatus'),
      payoutStatus: validateEnum(query.payoutStatus, Object.values(PractitionerSettlementStatus), 'payoutStatus'),
    };
  }

  private parseDate(value: string | undefined, name: string) {
    if (!value) return undefined;
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${name} must be a valid ISO date`);
    return date;
  }

  private date(field: string, query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const value: Record<string, unknown> = {};
    if (query.fromDate || query.toDate) value[field] = { ...(query.fromDate ? { gte: query.fromDate } : {}), ...(query.toDate ? { lt: query.toDate } : {}) };
    return value;
  }

  private sessionWhere(query: ReturnType<AdminFinancialOverviewService['normalize']>): Prisma.SessionWhereInput {
    return {
      ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.bookingType === 'DIRECT' ? { packagePurchaseId: null } : {}),
      ...(query.bookingType === 'PACKAGE' ? { packagePurchaseId: { not: null } } : {}),
      ...(query.fulfillment === 'ORIGINAL' ? { fundingSource: 'ORIGINAL' } : {}),
      ...(query.fulfillment === 'REPLACEMENT' ? { fundingSource: 'ADMIN_REPLACEMENT' } : {}),
    };
  }

  private reviewWhere(query: ReturnType<AdminFinancialOverviewService['normalize']>, dateField: 'createdAt' | 'reviewedAt') {
    return {
      ...(query.currency ? { paymentCurrencyCode: query.currency } : {}),
      ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.reviewStatus ? { reviewStatus: query.reviewStatus } : {}),
      ...this.date(dateField, query),
      session: { is: this.sessionWhere(query) },
    } as Prisma.SessionEarningReviewWhereInput;
  }

  private bucket(rows: AmountRow[], amountKey = 'amount') {
    return rows.filter((row) => row.currency).map((row) => ({
      currency: row.currency!,
      amount: this.money((row as any)[amountKey] ?? row.amount),
      count: Number(row.count),
    }));
  }

  private money(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return '0.00';
    return new Prisma.Decimal(value).toFixed(2);
  }

  private async aggregateReviews(where: Prisma.SessionEarningReviewWhereInput, field: 'paymentAmount' | 'suggestedPractitionerAmount' | 'accountantApprovedSourceAmount', extra?: Prisma.SessionEarningReviewWhereInput) {
    const rows = await this.prisma.sessionEarningReview.groupBy({
      by: ['paymentCurrencyCode'],
      where: { ...where, ...extra },
      _sum: { [field]: true } as any,
      _count: { _all: true },
      orderBy: { paymentCurrencyCode: 'asc' },
    } as any);
    return this.bucket(rows.map((row: any) => ({ currency: row.paymentCurrencyCode, amount: row._sum[field], count: row._count._all })));
  }

  private async aggregateAccountingReviewMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const predicates: Prisma.Sql[] = [];
    if (query.currency) predicates.push(Prisma.sql`r."paymentCurrencyCode" = ${query.currency}`);
    if (query.practitionerId) predicates.push(Prisma.sql`r."practitionerId" = ${query.practitionerId}::uuid`);
    if (query.patientId) predicates.push(Prisma.sql`r."patientId" = ${query.patientId}::uuid`);
    if (query.reviewStatus) predicates.push(Prisma.sql`r."reviewStatus" = ${query.reviewStatus}::"SessionEarningReviewStatus"`);
    if (query.bookingType === 'DIRECT') predicates.push(Prisma.sql`s."packagePurchaseId" IS NULL`);
    if (query.bookingType === 'PACKAGE') predicates.push(Prisma.sql`s."packagePurchaseId" IS NOT NULL`);
    if (query.fulfillment === 'ORIGINAL') predicates.push(Prisma.sql`s."fundingSource" = 'ORIGINAL'`);
    if (query.fulfillment === 'REPLACEMENT') predicates.push(Prisma.sql`s."fundingSource" = 'ADMIN_REPLACEMENT'`);
    const dateFilter = (column: 'createdAt' | 'reviewedAt') => [
      ...(query.fromDate ? [Prisma.sql`r."${Prisma.raw(column)}" >= ${query.fromDate}`] : []),
      ...(query.toDate ? [Prisma.sql`r."${Prisma.raw(column)}" < ${query.toDate}`] : []),
      ...(!query.fromDate && !query.toDate ? [Prisma.sql`TRUE`] : []),
    ];
    const metricFilter = (status: string, column: 'createdAt' | 'reviewedAt') => Prisma.join([
      Prisma.sql`r."reviewStatus" = ${Prisma.raw(`'${status}'::"SessionEarningReviewStatus"`)}`,
      ...dateFilter(column),
    ], ' AND ');
    const rows = await this.prisma.$queryRaw<Array<Record<string, Prisma.Decimal | bigint | string | null>>>(Prisma.sql`
      SELECT r."paymentCurrencyCode" AS currency,
        SUM(r."paymentAmount") FILTER (WHERE ${metricFilter('PENDING_REVIEW', 'createdAt')}) AS awaiting,
        COUNT(*) FILTER (WHERE ${metricFilter('PENDING_REVIEW', 'createdAt')})::bigint AS awaiting_count,
        SUM(r."suggestedPractitionerAmount") FILTER (WHERE ${metricFilter('PENDING_REVIEW', 'createdAt')}) AS awaiting_suggested,
        COUNT(*) FILTER (WHERE ${metricFilter('PENDING_REVIEW', 'createdAt')})::bigint AS awaiting_suggested_count,
        SUM(r."accountantApprovedSourceAmount") FILTER (WHERE ${metricFilter('DECISION_APPROVED', 'reviewedAt')} AND r."accountantApprovedSourceAmount" IS NOT NULL) AS approved_awaiting,
        COUNT(*) FILTER (WHERE ${metricFilter('DECISION_APPROVED', 'reviewedAt')} AND r."accountantApprovedSourceAmount" IS NOT NULL)::bigint AS approved_awaiting_count,
        SUM(r."accountantApprovedSourceAmount") FILTER (WHERE ${metricFilter('APPROVED', 'reviewedAt')} AND r."accountantApprovedSourceAmount" IS NOT NULL) AS approved_credited,
        COUNT(*) FILTER (WHERE ${metricFilter('APPROVED', 'reviewedAt')} AND r."accountantApprovedSourceAmount" IS NOT NULL)::bigint AS approved_credited_count,
        SUM(r."paymentAmount") FILTER (WHERE r."reviewStatus" IN ('REJECTED', 'EXCLUDED_FROM_PAYOUT') AND ${Prisma.join(dateFilter('createdAt'), ' AND ')}) AS rejected,
        COUNT(*) FILTER (WHERE r."reviewStatus" IN ('REJECTED', 'EXCLUDED_FROM_PAYOUT') AND ${Prisma.join(dateFilter('createdAt'), ' AND ')})::bigint AS rejected_count
      FROM "SessionEarningReview" r
      INNER JOIN "Session" s ON s."id" = r."sessionId"
      ${predicates.length ? Prisma.sql`WHERE ${Prisma.join(predicates, ' AND ')}` : Prisma.empty}
      GROUP BY r."paymentCurrencyCode"
      ORDER BY r."paymentCurrencyCode"
    `);
    const make = (row: Record<string, any>, amount: string, count: string) => ({ currency: row.currency as string, amount: this.money(row[amount] as any), count: Number(row[count] ?? 0) });
    return {
      awaiting: rows.map((row) => make(row, 'awaiting', 'awaiting_count')).filter((row) => row.count > 0),
      awaitingSuggested: rows.map((row) => make(row, 'awaiting_suggested', 'awaiting_suggested_count')).filter((row) => row.count > 0),
      approvedAwaiting: rows.map((row) => make(row, 'approved_awaiting', 'approved_awaiting_count')).filter((row) => row.count > 0),
      approvedCredited: rows.map((row) => make(row, 'approved_credited', 'approved_credited_count')).filter((row) => row.count > 0),
      rejected: rows.map((row) => make(row, 'rejected', 'rejected_count')).filter((row) => row.count > 0),
    };
  }

  private async aggregateAccountingPaymentMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const predicates: Prisma.Sql[] = [];
    if (query.currency) predicates.push(Prisma.sql`p."currencyCode" = ${query.currency}`);
    if (query.practitionerId) predicates.push(Prisma.sql`p."practitionerId" = ${query.practitionerId}::uuid`);
    if (query.patientId) predicates.push(Prisma.sql`p."patientId" = ${query.patientId}::uuid`);
    if (query.bookingType === 'DIRECT') predicates.push(Prisma.sql`s."packagePurchaseId" IS NULL`);
    if (query.bookingType === 'PACKAGE') predicates.push(Prisma.sql`(s."packagePurchaseId" IS NOT NULL OR EXISTS (SELECT 1 FROM "PatientPackagePurchase" pp WHERE pp."paymentId" = p."id"))`);
    if (query.fulfillment === 'ORIGINAL') predicates.push(Prisma.sql`s."fundingSource" = 'ORIGINAL'`);
    if (query.fulfillment === 'REPLACEMENT') predicates.push(Prisma.sql`s."fundingSource" = 'ADMIN_REPLACEMENT'`);
    const capturedDate = [
      Prisma.sql`p."status" = 'CAPTURED'::"PaymentStatus"`, Prisma.sql`p."capturedAt" IS NOT NULL`,
      ...(query.fromDate ? [Prisma.sql`p."capturedAt" >= ${query.fromDate}`] : []),
      ...(query.toDate ? [Prisma.sql`p."capturedAt" < ${query.toDate}`] : []),
    ];
    const status = query.paymentStatus ?? PaymentStatus.CAPTURED;
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
      SELECT p."currencyCode" AS currency,
        SUM(p."amountTotal") FILTER (WHERE ${Prisma.join(capturedDate, ' AND ')}) AS captured,
        COUNT(*) FILTER (WHERE ${Prisma.join(capturedDate, ' AND ')})::bigint AS captured_count,
        COUNT(*) FILTER (WHERE p."status" = ${status}::"PaymentStatus")::bigint AS status_count
      FROM "Payment" p
      LEFT JOIN "Session" s ON s."id" = p."sessionId"
      ${predicates.length ? Prisma.sql`WHERE ${Prisma.join(predicates, ' AND ')}` : Prisma.empty}
      GROUP BY p."currencyCode" ORDER BY p."currencyCode"
    `);
    return {
      payments: rows.map((row) => ({ currency: row.currency, amount: this.money(row.captured), count: Number(row.captured_count ?? 0) })).filter((row) => row.count > 0),
      statuses: rows.map((row) => ({ status, currency: row.currency, count: Number(row.status_count ?? 0) })).filter((row) => row.count > 0),
    };
  }

  private async rawCompletedAggregate(query: ReturnType<AdminFinancialOverviewService['normalize']>, kind: 'service' | 'suggestedPlatform' | 'remainder') {
    const predicates: Prisma.Sql[] = [Prisma.sql`s."status" = 'COMPLETED'`, Prisma.sql`r."reviewStatus" <> 'EXCLUDED_FROM_PAYOUT'`];
    if (kind === 'remainder') predicates.push(Prisma.sql`r."reviewStatus" IN ('DECISION_APPROVED', 'APPROVED') AND r."accountantApprovedSourceAmount" IS NOT NULL`);
    if (query.currency) predicates.push(Prisma.sql`r."paymentCurrencyCode" = ${query.currency}`);
    if (query.practitionerId) predicates.push(Prisma.sql`r."practitionerId" = ${query.practitionerId}::uuid`);
    if (query.patientId) predicates.push(Prisma.sql`r."patientId" = ${query.patientId}::uuid`);
    if (query.bookingType === 'DIRECT') predicates.push(Prisma.sql`s."packagePurchaseId" IS NULL`);
    if (query.bookingType === 'PACKAGE') predicates.push(Prisma.sql`s."packagePurchaseId" IS NOT NULL`);
    if (query.fulfillment === 'ORIGINAL') predicates.push(Prisma.sql`s."fundingSource" = 'ORIGINAL'`);
    if (query.fulfillment === 'REPLACEMENT') predicates.push(Prisma.sql`s."fundingSource" = 'ADMIN_REPLACEMENT'`);
    const dateColumn = kind === 'remainder' ? Prisma.sql`r."reviewedAt"` : kind === 'suggestedPlatform' ? Prisma.sql`r."createdAt"` : Prisma.sql`s."completedAt"`;
    if (query.fromDate) predicates.push(Prisma.sql`${dateColumn} >= ${query.fromDate}`);
    if (query.toDate) predicates.push(Prisma.sql`${dateColumn} < ${query.toDate}`);
    const expression = kind === 'service' ? Prisma.sql`r."paymentAmount"` : kind === 'suggestedPlatform' ? Prisma.sql`r."suggestedPlatformAmount"` : Prisma.sql`r."paymentAmount" - r."accountantApprovedSourceAmount"`;
    const rows = await this.prisma.$queryRaw<Array<{ currency: string; amount: Prisma.Decimal; count: bigint }>>(Prisma.sql`
      WITH ranked AS (
        SELECT r."paymentCurrencyCode", ${expression} AS amount,
          ROW_NUMBER() OVER (
            PARTITION BY r."earningEntitlementId"
            ORDER BY CASE WHEN s."fundingSource" = 'ADMIN_REPLACEMENT' THEN 0 ELSE 1 END, r."createdAt" DESC, r."id" DESC
          ) AS rn
        FROM "SessionEarningReview" r
        INNER JOIN "Session" s ON s."id" = r."sessionId"
        WHERE ${Prisma.join(predicates, ' AND ')}
      )
      SELECT "paymentCurrencyCode" AS currency, SUM(amount) AS amount, COUNT(*)::bigint AS count
      FROM ranked WHERE rn = 1 GROUP BY "paymentCurrencyCode" ORDER BY "paymentCurrencyCode"
    `);
    return this.bucket(rows as any);
  }

  private async rawCompletedMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const predicates: Prisma.Sql[] = [Prisma.sql`s."status" = 'COMPLETED'`, Prisma.sql`r."reviewStatus" <> 'EXCLUDED_FROM_PAYOUT'`];
    if (query.currency) predicates.push(Prisma.sql`r."paymentCurrencyCode" = ${query.currency}`);
    if (query.practitionerId) predicates.push(Prisma.sql`r."practitionerId" = ${query.practitionerId}::uuid`);
    if (query.patientId) predicates.push(Prisma.sql`r."patientId" = ${query.patientId}::uuid`);
    if (query.bookingType === 'DIRECT') predicates.push(Prisma.sql`s."packagePurchaseId" IS NULL`);
    if (query.bookingType === 'PACKAGE') predicates.push(Prisma.sql`s."packagePurchaseId" IS NOT NULL`);
    if (query.fulfillment === 'ORIGINAL') predicates.push(Prisma.sql`s."fundingSource" = 'ORIGINAL'`);
    if (query.fulfillment === 'REPLACEMENT') predicates.push(Prisma.sql`s."fundingSource" = 'ADMIN_REPLACEMENT'`);
    const date = (column: 'session_completed_at' | 'review_created_at' | 'review_reviewed_at') => [
      ...(query.fromDate ? [Prisma.sql`${Prisma.raw(column)} >= ${query.fromDate}`] : []),
      ...(query.toDate ? [Prisma.sql`${Prisma.raw(column)} < ${query.toDate}`] : []),
      ...(!query.fromDate && !query.toDate ? [Prisma.sql`TRUE`] : []),
    ];
    const filter = (extra: Prisma.Sql[]) => Prisma.join(extra, ' AND ');
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
      WITH ranked AS (
        SELECT r."paymentCurrencyCode" AS currency, r."paymentAmount", r."suggestedPlatformAmount", r."accountantApprovedSourceAmount", r."reviewStatus", r."createdAt" AS review_created_at, r."reviewedAt" AS review_reviewed_at, s."completedAt" AS session_completed_at,
          ROW_NUMBER() OVER (PARTITION BY r."earningEntitlementId" ORDER BY CASE WHEN s."fundingSource" = 'ADMIN_REPLACEMENT' THEN 0 ELSE 1 END, r."createdAt" DESC, r."id" DESC) AS rn
        FROM "SessionEarningReview" r INNER JOIN "Session" s ON s."id" = r."sessionId"
        WHERE ${Prisma.join(predicates, ' AND ')}
      )
      SELECT currency,
        SUM("paymentAmount") FILTER (WHERE rn = 1 AND ${filter(date('session_completed_at'))}) AS service,
        COUNT(*) FILTER (WHERE rn = 1 AND ${filter(date('session_completed_at'))})::bigint AS service_count,
        SUM("suggestedPlatformAmount") FILTER (WHERE rn = 1 AND ${filter(date('review_created_at'))}) AS suggested_platform,
        COUNT(*) FILTER (WHERE rn = 1 AND ${filter(date('review_created_at'))})::bigint AS suggested_platform_count,
        SUM("paymentAmount" - "accountantApprovedSourceAmount") FILTER (WHERE rn = 1 AND "reviewStatus" IN ('DECISION_APPROVED', 'APPROVED') AND "accountantApprovedSourceAmount" IS NOT NULL AND ${filter(date('review_reviewed_at'))}) AS remainder,
        COUNT(*) FILTER (WHERE rn = 1 AND "reviewStatus" IN ('DECISION_APPROVED', 'APPROVED') AND "accountantApprovedSourceAmount" IS NOT NULL AND ${filter(date('review_reviewed_at'))})::bigint AS remainder_count
      FROM ranked GROUP BY currency ORDER BY currency
    `);
    const make = (row: Record<string, any>, amount: string, count: string) => ({ currency: row.currency as string, amount: this.money(row[amount]), count: Number(row[count] ?? 0) });
    return {
      service: rows.map((row) => make(row, 'service', 'service_count')).filter((row) => row.count > 0),
      suggestedPlatform: rows.map((row) => make(row, 'suggested_platform', 'suggested_platform_count')).filter((row) => row.count > 0),
      remainder: rows.map((row) => make(row, 'remainder', 'remainder_count')).filter((row) => row.count > 0),
    };
  }

  private async aggregateReviewAndCompletedMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const predicates: Prisma.Sql[] = [];
    if (query.currency) predicates.push(Prisma.sql`r."paymentCurrencyCode" = ${query.currency}`);
    if (query.practitionerId) predicates.push(Prisma.sql`r."practitionerId" = ${query.practitionerId}::uuid`);
    if (query.patientId) predicates.push(Prisma.sql`r."patientId" = ${query.patientId}::uuid`);
    if (query.reviewStatus) predicates.push(Prisma.sql`r."reviewStatus" = ${query.reviewStatus}::"SessionEarningReviewStatus"`);
    if (query.bookingType === 'DIRECT') predicates.push(Prisma.sql`s."packagePurchaseId" IS NULL`);
    if (query.bookingType === 'PACKAGE') predicates.push(Prisma.sql`s."packagePurchaseId" IS NOT NULL`);
    if (query.fulfillment === 'ORIGINAL') predicates.push(Prisma.sql`s."fundingSource" = 'ORIGINAL'`);
    if (query.fulfillment === 'REPLACEMENT') predicates.push(Prisma.sql`s."fundingSource" = 'ADMIN_REPLACEMENT'`);
    if (!predicates.length) predicates.push(Prisma.sql`TRUE`);
    const range = (column: 'createdAt' | 'reviewedAt' | 'completedAt') => [
      ...(query.fromDate ? [Prisma.sql`${Prisma.raw(column === 'completedAt' ? 'session_completed_at' : column === 'createdAt' ? 'review_created_at' : 'review_reviewed_at')} >= ${query.fromDate}`] : []),
      ...(query.toDate ? [Prisma.sql`${Prisma.raw(column === 'completedAt' ? 'session_completed_at' : column === 'createdAt' ? 'review_created_at' : 'review_reviewed_at')} < ${query.toDate}`] : []),
      ...(!query.fromDate && !query.toDate ? [Prisma.sql`TRUE`] : []),
    ];
    const reviewRange = (status: string, column: 'createdAt' | 'reviewedAt') => Prisma.join([
      Prisma.sql`review_status = ${Prisma.raw(`'${status}'::"SessionEarningReviewStatus"`)}`,
      ...range(column),
    ], ' AND ');
    const join = (items: Prisma.Sql[]) => items.length ? Prisma.join(items, ' AND ') : Prisma.sql`TRUE`;
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>(Prisma.sql`
      WITH ranked AS (
        SELECT r."paymentCurrencyCode" AS currency, r."paymentAmount", r."suggestedPractitionerAmount", r."suggestedPlatformAmount", r."accountantApprovedSourceAmount", r."reviewStatus" AS review_status,
          r."createdAt" AS review_created_at, r."reviewedAt" AS review_reviewed_at, s."completedAt" AS session_completed_at,
          s."status" AS session_status,
          ROW_NUMBER() OVER (PARTITION BY r."earningEntitlementId" ORDER BY CASE WHEN s."fundingSource" = 'ADMIN_REPLACEMENT' THEN 0 ELSE 1 END, r."createdAt" DESC, r."id" DESC) AS rn
        FROM "SessionEarningReview" r INNER JOIN "Session" s ON s."id" = r."sessionId"
        WHERE ${join(predicates)}
      )
      SELECT currency,
        SUM("paymentAmount") FILTER (WHERE ${reviewRange('PENDING_REVIEW', 'createdAt')}) AS awaiting,
        COUNT(*) FILTER (WHERE ${reviewRange('PENDING_REVIEW', 'createdAt')})::bigint AS awaiting_count,
        SUM("suggestedPractitionerAmount") FILTER (WHERE ${reviewRange('PENDING_REVIEW', 'createdAt')}) AS awaiting_suggested,
        COUNT(*) FILTER (WHERE ${reviewRange('PENDING_REVIEW', 'createdAt')})::bigint AS awaiting_suggested_count,
        SUM("accountantApprovedSourceAmount") FILTER (WHERE ${reviewRange('DECISION_APPROVED', 'reviewedAt')} AND "accountantApprovedSourceAmount" IS NOT NULL) AS approved_awaiting,
        COUNT(*) FILTER (WHERE ${reviewRange('DECISION_APPROVED', 'reviewedAt')} AND "accountantApprovedSourceAmount" IS NOT NULL)::bigint AS approved_awaiting_count,
        SUM("accountantApprovedSourceAmount") FILTER (WHERE ${reviewRange('APPROVED', 'reviewedAt')} AND "accountantApprovedSourceAmount" IS NOT NULL) AS approved_credited,
        COUNT(*) FILTER (WHERE ${reviewRange('APPROVED', 'reviewedAt')} AND "accountantApprovedSourceAmount" IS NOT NULL)::bigint AS approved_credited_count,
        SUM("paymentAmount") FILTER (WHERE review_status IN ('REJECTED', 'EXCLUDED_FROM_PAYOUT') AND ${join(range('createdAt'))}) AS rejected,
        COUNT(*) FILTER (WHERE review_status IN ('REJECTED', 'EXCLUDED_FROM_PAYOUT') AND ${join(range('createdAt'))})::bigint AS rejected_count,
        -- REJECTED means the accountant declined practitioner payment, not that a completed service was unfulfilled.
        -- EXCLUDED_FROM_PAYOUT is the explicit invalid/superseded entitlement state and is excluded.
        SUM("paymentAmount") FILTER (WHERE rn = 1 AND session_status = 'COMPLETED' AND review_status <> 'EXCLUDED_FROM_PAYOUT' AND ${join(range('completedAt'))}) AS service,
        COUNT(*) FILTER (WHERE rn = 1 AND session_status = 'COMPLETED' AND review_status <> 'EXCLUDED_FROM_PAYOUT' AND ${join(range('completedAt'))})::bigint AS service_count,
        SUM("suggestedPlatformAmount") FILTER (WHERE rn = 1 AND review_status NOT IN ('REJECTED', 'EXCLUDED_FROM_PAYOUT') AND ${join(range('createdAt'))}) AS suggested_platform,
        COUNT(*) FILTER (WHERE rn = 1 AND review_status NOT IN ('REJECTED', 'EXCLUDED_FROM_PAYOUT') AND ${join(range('createdAt'))})::bigint AS suggested_platform_count,
        SUM("paymentAmount" - "accountantApprovedSourceAmount") FILTER (WHERE rn = 1 AND review_status IN ('DECISION_APPROVED', 'APPROVED') AND "accountantApprovedSourceAmount" IS NOT NULL AND ${join(range('reviewedAt'))}) AS remainder,
        COUNT(*) FILTER (WHERE rn = 1 AND review_status IN ('DECISION_APPROVED', 'APPROVED') AND "accountantApprovedSourceAmount" IS NOT NULL AND ${join(range('reviewedAt'))})::bigint AS remainder_count
      FROM ranked GROUP BY currency ORDER BY currency
    `);
    const make = (row: Record<string, any>, amount: string, count: string) => ({ currency: row.currency as string, amount: this.money(row[amount]), count: Number(row[count] ?? 0) });
    return {
      awaiting: rows.map((row) => make(row, 'awaiting', 'awaiting_count')).filter((row) => row.count > 0),
      awaitingSuggested: rows.map((row) => make(row, 'awaiting_suggested', 'awaiting_suggested_count')).filter((row) => row.count > 0),
      approvedAwaiting: rows.map((row) => make(row, 'approved_awaiting', 'approved_awaiting_count')).filter((row) => row.count > 0),
      approvedCredited: rows.map((row) => make(row, 'approved_credited', 'approved_credited_count')).filter((row) => row.count > 0),
      rejected: rows.map((row) => make(row, 'rejected', 'rejected_count')).filter((row) => row.count > 0),
      service: rows.map((row) => make(row, 'service', 'service_count')).filter((row) => row.count > 0),
      suggestedPlatform: rows.map((row) => make(row, 'suggested_platform', 'suggested_platform_count')).filter((row) => row.count > 0),
      remainder: rows.map((row) => make(row, 'remainder', 'remainder_count')).filter((row) => row.count > 0),
    };
  }

  private emptyMetrics() {
    return {
      grossPatientCollections: [], patientWalletCredits: [], completedServiceEconomicValue: [],
      awaitingAccountantReview: [], awaitingAccountantReviewSuggestedPractitioner: [],
      accountantApprovedAwaitingWalletCredit: [], accountantApprovedAlreadyWalletCredited: [],
      practitionerWalletCredits: [], outstandingPractitionerWalletLiability: [], availableForPayout: [], currentPractitionerWalletBalances: [],
      completedExternalPractitionerPayouts: [], completedExternalPayoutDebits: [], pendingExternalPractitionerPayouts: [], failedOrReversedExternalPayouts: [],
      platformSuggestedShare: [], platformRemainderAfterDecision: [],
      accountingAdditions: [], accountingDeductions: [], rejectedOrExcludedCandidates: [], paymentStatusCounts: [],
    } as any;
  }

  private async buildCollectionsMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const paymentWhere: Prisma.PaymentWhereInput = {
      status: PaymentStatus.CAPTURED,
      capturedAt: { not: null, ...this.date('capturedAt', query).capturedAt as object },
      ...(query.currency ? { currencyCode: query.currency } : {}),
      ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
    } as any;
    const walletEntryWhere: Prisma.CustomerWalletEntryWhereInput = {
      direction: CustomerWalletEntryDirection.CREDIT,
      entryType: { in: [CustomerWalletEntryType.REFUND_CREDIT, CustomerWalletEntryType.MANUAL_CREDIT, CustomerWalletEntryType.ADJUSTMENT] },
      ...this.date('effectiveAt', query),
      ...(query.currency ? { currencyCode: query.currency } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
    };
    const [payments, patientCredits, statuses, completedService] = await Promise.all([
      this.prisma.payment.groupBy({ by: ['currencyCode'], where: paymentWhere, _sum: { amountTotal: true }, _count: { _all: true }, orderBy: { currencyCode: 'asc' } }).then((rows: any[]) => rows.map((row) => ({ currency: row.currencyCode, amount: this.money(row._sum.amountTotal), count: row._count._all }))),
      this.prisma.customerWalletEntry.groupBy({ by: ['currencyCode'], where: walletEntryWhere, _sum: { amount: true }, _count: { _all: true }, orderBy: { currencyCode: 'asc' } }).then((rows: any[]) => rows.map((row) => ({ currency: row.currencyCode, amount: this.money(row._sum.amount), count: row._count._all }))),
      this.prisma.payment.groupBy({ by: ['status', 'currencyCode'], where: { ...paymentWhere, capturedAt: undefined, status: (query.paymentStatus as PaymentStatus | undefined) || undefined }, _count: { _all: true }, orderBy: [{ status: 'asc' }, { currencyCode: 'asc' }] }).then((rows: any[]) => rows.map((row) => ({ status: row.status, currency: row.currencyCode, count: row._count._all }))),
      this.aggregateReviewAndCompletedMetrics(query).then((metrics) => metrics.service),
    ]);
    return { ...this.emptyMetrics(), grossPatientCollections: payments, patientWalletCredits: patientCredits, completedServiceEconomicValue: completedService, paymentStatusCounts: statuses };
  }

  private async buildWalletMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const walletLedgerWhere: Prisma.LedgerEntryWhereInput = {
      entryType: LedgerEntryType.PRACTITIONER_EARNING, direction: LedgerDirection.CREDIT,
      ...this.date('effectiveAt', query), ...(query.currency ? { currencyCode: query.currency } : {}), ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}),
    };
    const payoutWhere = { ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}), ...(query.payoutStatus ? { payoutStatus: query.payoutStatus } : {}), ...this.date('effectiveAt', query) };
    const [walletCredits, balances, payouts, availablePayouts, pendingPayouts, failedPayouts] = await Promise.all([
      this.prisma.ledgerEntry.groupBy({ by: ['currencyCode'], where: walletLedgerWhere, _sum: { amount: true }, _count: { _all: true }, orderBy: { currencyCode: 'asc' } }).then((rows: any[]) => rows.map((row) => ({ currency: row.currencyCode, amount: this.money(row._sum.amount), count: row._count._all }))),
      this.practitionerWalletBalanceBuckets(query),
      this.payoutBuckets(payoutWhere, successfulPayoutStatuses, query.currency),
      this.settlementBuckets(query, availableForPayoutStatuses),
      this.settlementBuckets(query, pendingExternalPayoutStatuses),
      this.failedPayoutBuckets(query),
    ]);
    const liability = balances.map(({ currency, amount, count }) => ({ currency, amount, count }));
    return { ...this.emptyMetrics(), practitionerWalletCredits: walletCredits, outstandingPractitionerWalletLiability: liability, availableForPayout: availablePayouts, currentPractitionerWalletBalances: balances, completedExternalPractitionerPayouts: payouts, completedExternalPayoutDebits: payouts, pendingExternalPractitionerPayouts: pendingPayouts, failedOrReversedExternalPayouts: failedPayouts };
  }

  private async buildPayoutMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const payoutWhere = { ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}), ...(query.payoutStatus ? { payoutStatus: query.payoutStatus } : {}), ...this.date('effectiveAt', query) };
    const [completed, pending, failed] = await Promise.all([this.payoutBuckets(payoutWhere, successfulPayoutStatuses, query.currency), this.settlementBuckets(query, pendingExternalPayoutStatuses), this.failedPayoutBuckets(query)]);
    return { ...this.emptyMetrics(), completedExternalPractitionerPayouts: completed, completedExternalPayoutDebits: completed, pendingExternalPractitionerPayouts: pending, failedOrReversedExternalPayouts: failed };
  }

  private async buildMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>, scope: AdminFinancialOverviewScope) {
    if (scope === 'COLLECTIONS') return this.buildCollectionsMetrics(query);
    if (scope === 'WALLET') return this.buildWalletMetrics(query);
    if (scope === 'PAYOUT') return this.buildPayoutMetrics(query);
    return this.buildAccountingMetrics(query, scope);
  }

  private async buildAccountingMetrics(query: ReturnType<AdminFinancialOverviewService['normalize']>, scope: AdminFinancialOverviewScope) {
    const empty = () => [] as any[];
    const paymentWhere: Prisma.PaymentWhereInput = {
      status: PaymentStatus.CAPTURED,
      capturedAt: { not: null, ...this.date('capturedAt', query).capturedAt as object },
      ...(query.currency ? { currencyCode: query.currency } : {}),
      ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.bookingType === 'DIRECT' ? { session: { is: { packagePurchaseId: null } } } : {}),
      ...(query.bookingType === 'PACKAGE' ? { OR: [{ session: { is: { packagePurchaseId: { not: null } } } }, { patientPackagePurchase: { isNot: null } }] } : {}),
      ...(query.fulfillment ? { session: { is: this.sessionWhere(query) } } : {}),
    } as any;
    const walletEntryWhere: Prisma.CustomerWalletEntryWhereInput = {
      direction: CustomerWalletEntryDirection.CREDIT,
      entryType: { in: [CustomerWalletEntryType.REFUND_CREDIT, CustomerWalletEntryType.MANUAL_CREDIT, CustomerWalletEntryType.ADJUSTMENT] },
      ...this.date('effectiveAt', query),
      ...(query.currency ? { currencyCode: query.currency } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
    };
    const reviewBase = this.reviewWhere(query, 'createdAt');
    const approvedBase = this.reviewWhere(query, 'reviewedAt');
    const walletLedgerWhere: Prisma.LedgerEntryWhereInput = {
      entryType: LedgerEntryType.PRACTITIONER_EARNING,
      direction: LedgerDirection.CREDIT,
      ...this.date('effectiveAt', query),
      ...(query.currency ? { currencyCode: query.currency } : {}),
      ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}),
      ...(query.patientId || query.bookingType || query.fulfillment ? { sessionEarningReview: { is: { ...this.reviewWhere(query, 'createdAt'), ...(query.patientId ? { patientId: query.patientId } : {}) } } } : {}),
    } as any;
    const adjustmentWhere: Prisma.PractitionerEarningAdjustmentWhereInput = {
      ...this.date('createdAt', query),
      ...(query.currency ? { currencyCode: query.currency } : {}),
      sessionEarningReview: { is: this.reviewWhere(query, 'createdAt') },
    } as any;
    const payoutWhere = {
      ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}),
      ...(query.payoutStatus ? { status: query.payoutStatus } : {}),
      ...this.date('effectiveAt', query),
    } as any;
    const reviewAndCompletedMetricsPromise = this.aggregateReviewAndCompletedMetrics(query);
    const paymentMetricsPromise = this.aggregateAccountingPaymentMetrics(query);

    const [payments, patientCredits, statuses, awaiting, awaitingSuggested, approvedAwaiting, approvedCredited, walletCredits, balances, additions, deductions, rejected, completedPayouts, pendingPayouts, availablePayouts, failedPayouts, completedService, suggestedPlatform, remainder] = await Promise.all([
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : paymentMetricsPromise.then((metrics) => metrics.payments),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : this.prisma.customerWalletEntry.groupBy({ by: ['currencyCode'], where: walletEntryWhere, _sum: { amount: true }, _count: { _all: true }, orderBy: { currencyCode: 'asc' } }).then((rows: any[]) => rows.map((row) => ({ currency: row.currencyCode, amount: this.money(row._sum.amount), count: row._count._all }))),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : paymentMetricsPromise.then((metrics) => metrics.statuses),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : reviewAndCompletedMetricsPromise.then((metrics) => metrics.awaiting),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : reviewAndCompletedMetricsPromise.then((metrics) => metrics.awaitingSuggested),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : reviewAndCompletedMetricsPromise.then((metrics) => metrics.approvedAwaiting),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : reviewAndCompletedMetricsPromise.then((metrics) => metrics.approvedCredited),
      scope === 'ACCOUNTING' ? this.prisma.ledgerEntry.groupBy({ by: ['currencyCode'], where: walletLedgerWhere, _sum: { amount: true }, _count: { _all: true }, orderBy: { currencyCode: 'asc' } }).then((rows: any[]) => rows.map((row) => ({ currency: row.currencyCode, amount: this.money(row._sum.amount), count: row._count._all }))) : this.prisma.ledgerEntry.groupBy({ by: ['currencyCode'], where: walletLedgerWhere, _sum: { amount: true }, _count: { _all: true }, orderBy: { currencyCode: 'asc' } }).then((rows: any[]) => rows.map((row) => ({ currency: row.currencyCode, amount: this.money(row._sum.amount), count: row._count._all }))),
      this.practitionerWalletBalanceBuckets(query),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : this.prisma.practitionerEarningAdjustment.groupBy({ by: ['currencyCode'], where: { ...adjustmentWhere, type: PractitionerEarningAdjustmentType.ADDITION }, _sum: { amount: true }, _count: { _all: true }, orderBy: { currencyCode: 'asc' } }).then((rows: any[]) => rows.map((row) => ({ currency: row.currencyCode, amount: this.money(row._sum.amount), count: row._count._all }))),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : this.prisma.practitionerEarningAdjustment.groupBy({ by: ['currencyCode'], where: { ...adjustmentWhere, type: PractitionerEarningAdjustmentType.DEDUCTION }, _sum: { amount: true }, _count: { _all: true }, orderBy: { currencyCode: 'asc' } }).then((rows: any[]) => rows.map((row) => ({ currency: row.currencyCode, amount: this.money(row._sum.amount), count: row._count._all }))),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : reviewAndCompletedMetricsPromise.then((metrics) => metrics.rejected),
      scope === 'ACCOUNTING' || scope === 'PAYOUT' ? this.payoutBuckets(payoutWhere, successfulPayoutStatuses, query.currency) : Promise.resolve([]),
      scope === 'ACCOUNTING' || scope === 'PAYOUT' ? this.settlementBuckets(query, pendingExternalPayoutStatuses) : Promise.resolve([]),
      scope === 'ACCOUNTING' || scope === 'PAYOUT' ? this.settlementBuckets(query, availableForPayoutStatuses) : Promise.resolve([]),
      scope === 'ACCOUNTING' || scope === 'PAYOUT' ? this.failedPayoutBuckets(query) : Promise.resolve([]),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : reviewAndCompletedMetricsPromise.then((metrics) => metrics.service),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : reviewAndCompletedMetricsPromise.then((metrics) => metrics.suggestedPlatform),
      scope === 'WALLET' || scope === 'PAYOUT' ? Promise.resolve([]) : reviewAndCompletedMetricsPromise.then((metrics) => metrics.remainder),
    ]);
    const metrics = {
      grossPatientCollections: payments,
      patientWalletCredits: patientCredits,
      completedServiceEconomicValue: completedService,
      awaitingAccountantReview: awaiting,
      awaitingAccountantReviewSuggestedPractitioner: awaitingSuggested,
      accountantApprovedAwaitingWalletCredit: approvedAwaiting,
      accountantApprovedAlreadyWalletCredited: approvedCredited,
      practitionerWalletCredits: walletCredits,
      outstandingPractitionerWalletLiability: balances.map(({ currency, amount, count }) => ({ currency, amount, count })),
      availableForPayout: availablePayouts,
      currentPractitionerWalletBalances: balances,
      completedExternalPractitionerPayouts: completedPayouts,
      completedExternalPayoutDebits: completedPayouts,
      pendingExternalPractitionerPayouts: pendingPayouts,
      failedOrReversedExternalPayouts: failedPayouts,
      platformSuggestedShare: suggestedPlatform,
      platformRemainderAfterDecision: remainder,
      accountingAdditions: additions,
      accountingDeductions: deductions,
      rejectedOrExcludedCandidates: rejected,
      paymentStatusCounts: statuses,
    } as any;
    if (scope === 'COLLECTIONS') {
      return { ...metrics, completedServiceEconomicValue: [], awaitingAccountantReview: [], awaitingAccountantReviewSuggestedPractitioner: [], accountantApprovedAwaitingWalletCredit: [], accountantApprovedAlreadyWalletCredited: [], practitionerWalletCredits: [], currentPractitionerWalletBalances: [], completedExternalPractitionerPayouts: [], pendingExternalPractitionerPayouts: [], platformSuggestedShare: [], platformRemainderAfterDecision: [], accountingAdditions: [], accountingDeductions: [], rejectedOrExcludedCandidates: [] };
    }
    if (scope === 'WALLET') {
      return { ...metrics, grossPatientCollections: [], patientWalletCredits: [], completedServiceEconomicValue: [], awaitingAccountantReview: [], awaitingAccountantReviewSuggestedPractitioner: [], accountantApprovedAwaitingWalletCredit: [], accountantApprovedAlreadyWalletCredited: [], platformSuggestedShare: [], platformRemainderAfterDecision: [], accountingAdditions: [], accountingDeductions: [], rejectedOrExcludedCandidates: [], paymentStatusCounts: [] };
    }
    if (scope === 'PAYOUT') {
      return { ...metrics, grossPatientCollections: [], patientWalletCredits: [], completedServiceEconomicValue: [], awaitingAccountantReview: [], awaitingAccountantReviewSuggestedPractitioner: [], accountantApprovedAwaitingWalletCredit: [], accountantApprovedAlreadyWalletCredited: [], platformSuggestedShare: [], platformRemainderAfterDecision: [], accountingAdditions: [], accountingDeductions: [], rejectedOrExcludedCandidates: [], paymentStatusCounts: [] };
    }
    return metrics;
  }

  private async payoutBuckets(where: any, statuses: PractitionerSettlementStatus[], currency?: string) {
    const selectedStatuses = where.payoutStatus
      ? (statuses.includes(where.payoutStatus as PractitionerSettlementStatus) ? [where.payoutStatus as PractitionerSettlementStatus] : [])
      : statuses;
    if (!selectedStatuses.length) return [];
    const predicates: Prisma.Sql[] = [Prisma.sql`l."entryType" = 'SETTLEMENT_PAYOUT'::"LedgerEntryType"`, Prisma.sql`l."direction" = 'DEBIT'::"LedgerDirection"`, Prisma.sql`s."status" IN (${Prisma.join(selectedStatuses.map((status) => Prisma.sql`${status}::"PractitionerSettlementStatus"`), ', ')})`];
    if (where.practitionerId) predicates.push(Prisma.sql`l."practitionerId" = ${where.practitionerId}::uuid`);
    if (where.effectiveAt?.gte) predicates.push(Prisma.sql`l."effectiveAt" >= ${where.effectiveAt.gte}`);
    if (where.effectiveAt?.lt) predicates.push(Prisma.sql`l."effectiveAt" < ${where.effectiveAt.lt}`);
    if (currency) predicates.push(Prisma.sql`l."currencyCode" = ${currency}`);
    const rows = await this.prisma.$queryRaw<Array<{ currency: string; amount: Prisma.Decimal | null; count: bigint }>>(Prisma.sql`
      SELECT l."currencyCode" AS currency, SUM(l."amount") AS amount, COUNT(*)::bigint AS count
      FROM "LedgerEntry" l
      INNER JOIN "PractitionerSettlement" s ON s."id" = l."settlementId"
      WHERE ${Prisma.join(predicates, ' AND ')}
      GROUP BY l."currencyCode"
      ORDER BY currency
    `);
    return rows.map((row) => ({ currency: row.currency, amount: this.money(row.amount), count: Number(row.count) }));
  }

  private async practitionerWalletBalanceBuckets(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const walletWhere: Prisma.PractitionerWalletWhereInput = {
      status: (query.walletStatus ?? PractitionerWalletStatus.ACTIVE) as PractitionerWalletStatus,
      ...(query.currency ? { currencyCode: query.currency } : {}),
      ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}),
    };
    const wallets = await this.prisma.practitionerWallet.findMany({ where: walletWhere, select: { practitionerId: true, currencyCode: true } });
    if (!wallets.length) return [];
    const rows = await this.prisma.ledgerEntry.groupBy({
      by: ['currencyCode', 'balanceBucket', 'direction'],
      where: {
        OR: wallets.map((wallet) => ({ practitionerId: wallet.practitionerId, currencyCode: wallet.currencyCode })),
        ...(query.currency ? { currencyCode: query.currency } : {}),
      },
      _sum: { amount: true },
    });
    const totals = new Map<string, { available: Prisma.Decimal; pending: Prisma.Decimal; reserved: Prisma.Decimal }>();
    for (const row of rows) {
      const value = totals.get(row.currencyCode) ?? { available: new Prisma.Decimal(0), pending: new Prisma.Decimal(0), reserved: new Prisma.Decimal(0) };
      const signed = new Prisma.Decimal(row._sum.amount ?? 0).mul(row.direction === LedgerDirection.DEBIT ? -1 : 1);
      if (row.balanceBucket === 'AVAILABLE') value.available = value.available.add(signed);
      if (row.balanceBucket === 'PENDING') value.pending = value.pending.add(signed);
      if (row.balanceBucket === 'RESERVED') value.reserved = value.reserved.add(signed);
      totals.set(row.currencyCode, value);
    }
    const counts = new Map<string, number>();
    wallets.forEach((wallet) => counts.set(wallet.currencyCode, (counts.get(wallet.currencyCode) ?? 0) + 1));
    return [...counts.keys()].sort().map((currency) => {
      const value = totals.get(currency) ?? { available: new Prisma.Decimal(0), pending: new Prisma.Decimal(0), reserved: new Prisma.Decimal(0) };
      return {
        currency,
        amount: value.available.add(value.pending).add(value.reserved).toFixed(2),
        availableAmount: value.available.toFixed(2),
        lockedOrReservedAmount: value.pending.add(value.reserved).toFixed(2),
        count: counts.get(currency) ?? 0,
      };
    });
  }

  private async settlementBuckets(query: ReturnType<AdminFinancialOverviewService['normalize']>, statuses: PractitionerSettlementStatus[]) {
    const selectedStatuses = query.payoutStatus
      ? (statuses.includes(query.payoutStatus as PractitionerSettlementStatus) ? [query.payoutStatus] : [])
      : statuses;
    if (!selectedStatuses.length) return [];
    const rows = await this.prisma.practitionerSettlement.groupBy({
      by: ['walletCurrencyCode'],
      where: { status: { in: selectedStatuses }, ...(query.currency ? { walletCurrencyCode: query.currency } : {}), ...(query.practitionerId ? { practitionerId: query.practitionerId } : {}), ...this.date('createdAt', query) },
      _sum: { finalWalletCredit: true, amountPaidTotal: true },
      _count: { _all: true },
      orderBy: { walletCurrencyCode: 'asc' },
    } as any);
    return (rows as any[]).map((row) => ({ currency: row.walletCurrencyCode, amount: this.money(new Prisma.Decimal(row._sum.finalWalletCredit ?? 0).sub(row._sum.amountPaidTotal ?? 0).gt(0) ? new Prisma.Decimal(row._sum.finalWalletCredit ?? 0).sub(row._sum.amountPaidTotal ?? 0) : 0), count: row._count._all }));
  }

  private async failedPayoutBuckets(query: ReturnType<AdminFinancialOverviewService['normalize']>) {
    const predicates: Prisma.Sql[] = [Prisma.sql`s."status" IN ('FAILED'::"PractitionerSettlementStatus", 'CANCELLED'::"PractitionerSettlementStatus")`];
    if (query.practitionerId) predicates.push(Prisma.sql`p."practitionerId" = ${query.practitionerId}::uuid`);
    if (query.currency) predicates.push(Prisma.sql`COALESCE(p."payoutCurrencyCode", p."currencyCode") = ${query.currency}`);
    if (query.fromDate) predicates.push(Prisma.sql`p."effectiveAt" >= ${query.fromDate}`);
    if (query.toDate) predicates.push(Prisma.sql`p."effectiveAt" < ${query.toDate}`);
    const rows = await this.prisma.$queryRaw<Array<{ currency: string; amount: Prisma.Decimal | null; count: bigint }>>(Prisma.sql`
      SELECT COALESCE(p."payoutCurrencyCode", p."currencyCode") AS currency, SUM(p."amountPaid") AS amount, COUNT(*)::bigint AS count
      FROM "PractitionerSettlementPayout" p
      INNER JOIN "PractitionerSettlement" s ON s."id" = p."settlementId"
      WHERE ${Prisma.join(predicates, ' AND ')}
      GROUP BY COALESCE(p."payoutCurrencyCode", p."currencyCode")
      ORDER BY currency
    `);
    return rows.map((row) => ({ currency: row.currency, amount: this.money(row.amount), count: Number(row.count) }));
  }
}
