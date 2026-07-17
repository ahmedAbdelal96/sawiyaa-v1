"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Skeleton } from "@/components/shared/LoadingStates";
import {
  SurfaceActionLink,
  SurfaceCard,
  SurfaceHeader,
} from "@/components/shared/SurfaceShell";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatSettlementDateTime,
  formatSettlementMoney,
} from "@/features/admin/finance/lib/finance-formatters";
import {
  useAdminPractitionerManualPayouts,
  useAdminPractitionerPayoutBalance,
} from "../hooks/use-admin-practitioner-payouts";
import type { AdminPractitionerManualPayout } from "../types/admin-practitioner-payouts.types";
import AdminPractitionerPayoutDrawer, {
  type AdminPractitionerPayoutDrawerTarget,
} from "./AdminPractitionerPayoutDrawer";

type CurrencyCode = "EGP" | "USD";

function currencyLabel(t: ReturnType<typeof useTranslations>, currency: CurrencyCode) {
  return t(`currencies.${currency}` as Parameters<typeof t>[0]);
}

function CurrencyBalanceSection({
  currency,
  balance,
  locale,
  t,
  onPay,
}: {
  currency: CurrencyCode;
  balance: {
    practitionerId: string;
    practitionerName: string | null;
    currencyCode: string;
    normalSessionPayableAmount: string;
    packageReleasedPayableAmount: string;
    packageHeldAmount: string;
    totalPayableAmount: string;
    manualRecoveryAmount: string;
    lastPayoutAt: string | null;
  } | null;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  onPay: (currency: CurrencyCode) => void;
}) {
  const total = Number(balance?.totalPayableAmount ?? 0);
  const availableLabel = t("detail.availableForManualPayout");
  const heldLabel = t("detail.heldPackageBalance");

  const metrics: Array<{
    label: string;
    value: string;
    emphasized?: boolean;
  }> = [
    {
      label: t("detail.metrics.normalSessionPayable"),
      value: balance ? formatSettlementMoney(locale, balance.normalSessionPayableAmount, currency) : "-",
    },
    {
      label: t("detail.metrics.packageReleasedAmount"),
      value: balance
        ? formatSettlementMoney(locale, balance.packageReleasedPayableAmount, currency)
        : "-",
    },
    {
      label: t("detail.metrics.packageHeldAmount"),
      value: balance ? formatSettlementMoney(locale, balance.packageHeldAmount, currency) : "-",
    },
    {
      label: t("detail.metrics.remainingDue"),
      value: balance ? formatSettlementMoney(locale, balance.totalPayableAmount, currency) : "-",
      emphasized: true,
    },
  ];

  return (
    <SurfaceCard variant="section" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t(`detail.sections.${currency.toLowerCase()}` as Parameters<typeof t>[0])}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
            {currencyLabel(t, currency)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("detail.balanceScopeNote")}
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          disabled={total <= 0}
          onClick={() => onPay(currency)}
        >
          {t("detail.payNow")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-2xl border px-4 py-3 ${
              metric.emphasized
                ? "border-primary/20 bg-primary-light/40 dark:border-primary/30 dark:bg-primary/10"
                : "border-border-light bg-surface-secondary/50 dark:border-white/8 dark:bg-white/[0.03]"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {metric.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
        <p className="font-semibold">{t("manualRecoveryLabel")}</p>
        <p className="mt-1 font-semibold">
          {balance ? formatSettlementMoney(locale, balance.manualRecoveryAmount, currency) : "-"}
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-900/80 dark:text-amber-50/80">
          {t("manualRecoveryNote")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {availableLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
            {balance
              ? formatSettlementMoney(locale, balance.totalPayableAmount, currency)
              : t("unavailable")}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {heldLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
            {balance
              ? formatSettlementMoney(locale, balance.packageHeldAmount, currency)
              : t("unavailable")}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-surface-secondary/50 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
        <p className="font-semibold text-text-primary dark:text-white/95">
          {t("detail.metrics.lastPayout")}
        </p>
        <p className="mt-1">
          {balance?.lastPayoutAt ? formatSettlementDateTime(locale, balance.lastPayoutAt) : t("detail.lastPayoutEmpty")}
        </p>
      </div>
    </SurfaceCard>
  );
}

function PayoutHistoryTable({
  items,
  locale,
  t,
}: {
  items: AdminPractitionerManualPayout[];
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border-light bg-white shadow-[0_20px_50px_-34px_rgba(25,52,57,0.18)] dark:border-white/8 dark:bg-surface-secondary">
      <div className="overflow-x-auto">
        <Table className="text-sm">
          <TableHeader className="bg-surface-secondary/60 dark:bg-white/[0.03]">
            <TableRow className="border-border-light/60">
              <TableCell isHeader className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("detail.historyColumns.amount")}
              </TableCell>
              <TableCell isHeader className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("detail.historyColumns.currency")}
              </TableCell>
              <TableCell isHeader className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("detail.historyColumns.paidAt")}
              </TableCell>
              <TableCell isHeader className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("detail.historyColumns.paymentMethod")}
              </TableCell>
              <TableCell isHeader className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("detail.historyColumns.reference")}
              </TableCell>
              <TableCell isHeader className="px-5 py-4 text-start text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("detail.historyColumns.notes")}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-border-light/70 align-top">
                <TableCell className="px-5 py-4">
                  <span className="font-semibold text-text-primary dark:text-white/95">
                    {formatSettlementMoney(locale, item.amountPaid, item.currencyCode)}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-4 text-text-secondary">
                  {t(`currencies.${item.currencyCode}` as Parameters<typeof t>[0])}
                </TableCell>
                <TableCell className="px-5 py-4 text-text-secondary">
                  {formatSettlementDateTime(locale, item.paidAt)}
                </TableCell>
                <TableCell className="px-5 py-4 text-text-secondary">
                  {t(`paymentMethods.${item.payoutMethod}` as Parameters<typeof t>[0])}
                </TableCell>
                <TableCell className="px-5 py-4 text-text-secondary">
                  {item.transferReference ?? "-"}
                </TableCell>
                <TableCell className="px-5 py-4 text-text-secondary">
                  {item.notes ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function AdminPractitionerPayoutDetailScreen({
  practitionerId,
}: {
  practitionerId: string;
}) {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();
  const [drawerCurrency, setDrawerCurrency] = useState<CurrencyCode>("EGP");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const egpBalanceQuery = useAdminPractitionerPayoutBalance(practitionerId, "EGP");
  const usdBalanceQuery = useAdminPractitionerPayoutBalance(practitionerId, "USD");
  const payoutHistoryQuery = useAdminPractitionerManualPayouts(practitionerId, {
    page: 1,
    limit: 12,
  });

  const egpBalance = egpBalanceQuery.data?.item ?? null;
  const usdBalance = usdBalanceQuery.data?.item ?? null;
  const practitionerName =
    egpBalance?.practitionerName ?? usdBalance?.practitionerName ?? practitionerId;

  const drawerTarget = useMemo<AdminPractitionerPayoutDrawerTarget>(
    () => ({
      practitionerId,
      practitionerName,
      practitionerSlug: practitionerId,
    }),
    [practitionerId, practitionerName],
  );

  const hasAnyPayable =
    Number(egpBalance?.totalPayableAmount ?? 0) > 0 ||
    Number(usdBalance?.totalPayableAmount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <SurfaceCard variant="page">
        <SurfaceHeader
          eyebrow={t("detail.eyebrow")}
          title={practitionerName}
          description={t("detail.description")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SurfaceActionLink href="/admin/practitioner-payouts">
                {t("detail.backToList")}
              </SurfaceActionLink>
              <Button
                variant="primary"
                disabled={!hasAnyPayable}
                onClick={() => {
                  setDrawerCurrency(
                    Number(egpBalance?.totalPayableAmount ?? 0) > 0 ? "EGP" : "USD",
                  );
                  setIsDrawerOpen(true);
                }}
              >
                {t("detail.payNow")}
              </Button>
            </div>
          }
        />

        <div className="mt-5 rounded-2xl border border-warning-200 bg-warning-50/75 px-4 py-3 text-sm leading-6 text-warning-900 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-100">
          <p className="font-semibold">{t("detail.snapshotNote")}</p>
          <p className="mt-1 text-warning-900/80 dark:text-warning-50/80">
            {t("detail.manualTransferNote")}
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <CurrencyBalanceSection
            currency="EGP"
            balance={egpBalance}
            locale={locale}
            t={t}
            onPay={(currency) => {
              setDrawerCurrency(currency);
              setIsDrawerOpen(true);
            }}
          />
          <CurrencyBalanceSection
            currency="USD"
            balance={usdBalance}
            locale={locale}
            t={t}
            onPay={(currency) => {
              setDrawerCurrency(currency);
              setIsDrawerOpen(true);
            }}
          />
        </div>

        <SurfaceCard variant="compact" className="mt-6 border-border-light/70">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("detail.packageSectionTitle")}
            </p>
            <p className="text-sm leading-6 text-text-secondary">
              {t("detail.packageSectionDescription")}
            </p>
            <p className="text-sm leading-6 text-text-secondary">
              {t("detail.packageSectionNote")}
            </p>
          </div>
        </SurfaceCard>

        <div className="mt-6 space-y-4">
          <SurfaceHeader
            eyebrow={t("detail.historyEyebrow")}
            title={t("detail.historyTitle")}
            description={t("detail.historyDescription")}
          />

          <p className="text-sm leading-6 text-text-secondary">
            {t("detail.historyScopeNote")}
          </p>

          {payoutHistoryQuery.isLoading ? (
            <div className="space-y-3 rounded-[28px] border border-border-light bg-white p-5 dark:border-white/8 dark:bg-surface-secondary">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (payoutHistoryQuery.data?.items ?? []).length > 0 ? (
            <PayoutHistoryTable
              items={payoutHistoryQuery.data?.items ?? []}
              locale={locale}
              t={t}
            />
          ) : (
            <div className="rounded-[28px] border border-dashed border-border-light bg-surface-secondary/40 px-6 py-10 text-center dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-base font-semibold text-text-primary dark:text-white/95">
                {t("detail.historyEmptyTitle")}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t("detail.historyEmptyDescription")}
              </p>
            </div>
          )}
        </div>
      </SurfaceCard>

      <AdminPractitionerPayoutDrawer
        isOpen={isDrawerOpen}
        practitioner={isDrawerOpen ? drawerTarget : null}
        defaultCurrency={drawerCurrency}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          payoutHistoryQuery.refetch();
          egpBalanceQuery.refetch();
          usdBalanceQuery.refetch();
        }}
      />
    </div>
  );
}
