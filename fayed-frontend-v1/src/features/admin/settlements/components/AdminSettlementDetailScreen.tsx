"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  CircleOff,
  Coins,
  Info,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import Button from "@/components/ui/button/Button";
import DateTimeField from "@/components/form/input/DateTimeField";
import { useAuthState } from "@/stores/auth-store";
import { toAppError } from "@/lib/api/errors";
import {
  ADMIN_SETTLEMENT_BATCH_STATUS_STYLES,
  ADMIN_SETTLEMENT_ITEM_STATUS_STYLES,
  canMarkSettlementFailed,
  canMarkSettlementPaid,
  getAdminSettlementErrorKey,
} from "../lib/admin-settlement-status";
import {
  useAdminSettlementBatchDetails,
  useMarkAdminSettlementFailed,
  useMarkAdminSettlementPaid,
} from "../hooks/use-admin-settlements";
import type {
  SettlementBatchDetails,
  SettlementPayoutMethod,
} from "../types/admin-settlements.types";
import {
  formatSettlementDateTime,
  formatSettlementMoney,
  toDateTimeLocalInputValue,
} from "../lib/settlement-formatters";

type Props = {
  batchId: string;
};

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span
        className={`text-sm text-text-primary dark:text-white/90 ${
          mono ? "font-mono text-xs sm:text-sm" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
        {title}
      </h2>
      {note ? <p className="mt-1 text-sm leading-6 text-text-secondary">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </SurfaceCard>
  );
}

function BatchStatusChip({ status }: { status: SettlementBatchDetails["status"] }) {
  const t = useTranslations("admin-settlements");
  const className =
    ADMIN_SETTLEMENT_BATCH_STATUS_STYLES[status] ??
    "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/60";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {t(`statuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function ClarityTile({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <SurfaceCard variant="compact" className="rounded-[24px]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{note}</p>
    </SurfaceCard>
  );
}

function EmptyBatchState({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-500/25 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-amber-900 dark:text-amber-100">
            {t("detail.emptyBatch.heading")}
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
            {t("detail.emptyBatch.note")}
          </p>

          <div className="mt-4 rounded-[22px] border border-amber-200 bg-white/80 p-4 dark:border-amber-500/20 dark:bg-white/[0.04]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">
              {t("detail.emptyBatch.reasonsTitle")}
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary dark:text-white/75">
              <li>{t("detail.emptyBatch.reasons.periodCurrency")}</li>
              <li>{t("detail.emptyBatch.reasons.assignedElsewhere")}</li>
              <li>{t("detail.emptyBatch.reasons.exceptionPath")}</li>
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/settlements/dues"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("detail.emptyBatch.primaryAction")}
            </Link>
            <Link
              href="/admin/settlements/dues"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("detail.emptyBatch.secondaryAction")}
            </Link>
            <Link
              href="/admin/settlements/dues"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/8"
            >
              {t("detail.emptyBatch.exceptionAction")}
            </Link>
          </div>

          <p className="mt-4 text-xs text-text-muted">
            {t("detail.actionMeaning.markPaid")}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            {t("detail.actionMeaning.markFailed")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettlementDetailScreen({ batchId }: Props) {
  const t = useTranslations("admin-settlements");
  const locale = useLocale();
  const { user } = useAuthState();
  const canOperate = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const batchQuery = useAdminSettlementBatchDetails(batchId);
  const markPaidMutation = useMarkAdminSettlementPaid();
  const markFailedMutation = useMarkAdminSettlementFailed();

  const [paidRef, setPaidRef] = useState("");
  const [paidMethod, setPaidMethod] = useState<SettlementPayoutMethod>("OTHER");
  const [paidEffectiveAt, setPaidEffectiveAt] = useState(toDateTimeLocalInputValue());
  const [paidNotes, setPaidNotes] = useState("");
  const [failedNotes, setFailedNotes] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  const item = batchQuery.data?.item;
  const hasItems = Boolean(item?.items.length);
  const isEmptyBatch = Boolean(item && !hasItems);

  const actionState = useMemo(() => {
    if (!item) {
      return { canMarkPaid: false, canMarkFailed: false };
    }
    return {
      canMarkPaid: canMarkSettlementPaid(item.status),
      canMarkFailed: canMarkSettlementFailed(item.status),
    };
  }, [item]);

  const handleMarkPaid = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;
    setFeedback(null);

    try {
      await markPaidMutation.mutateAsync({
        batchId: item.id,
        data: {
          externalPayoutRef: paidRef.trim() || undefined,
          payoutMethod: paidMethod === "OTHER" ? undefined : paidMethod,
          effectiveAt: paidEffectiveAt || undefined,
          notes: paidNotes.trim() || undefined,
        },
      });
      setFeedback({ tone: "success", message: t("actions.markPaidSuccess") });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminSettlementErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  const handleMarkFailed = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;
    setFeedback(null);

    try {
      await markFailedMutation.mutateAsync({
        batchId: item.id,
        data: {
          notes: failedNotes.trim() || undefined,
        },
      });
      setFeedback({ tone: "success", message: t("actions.markFailedSuccess") });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminSettlementErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  if (batchQuery.isLoading) {
    return (
      <div className="space-y-5">
        <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
          <ListStateSkeleton items={1} heightClass="h-28" />
        </SurfaceCard>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-52" />
          </div>
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (batchQuery.isError || !item) {
    const error = batchQuery.error ? toAppError(batchQuery.error) : null;
    const isNotFound =
      error?.statusCode === 404 ||
      error?.code === "FINANCIAL_OPERATIONS_SETTLEMENT_BATCH_NOT_FOUND";

    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<Coins className="h-8 w-8 text-text-muted" />}
          title={isNotFound ? t("states.notFound.heading") : t("states.detailError.heading")}
          note={isNotFound ? t("states.notFound.note") : t("states.detailError.note")}
          action={{
            label: t("states.detailError.back"),
            href: (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!isNotFound ? (
                  <button
                    type="button"
                    onClick={() => batchQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
                  >
                    {t("states.detailError.retry")}
                  </button>
                ) : null}
                <Link
                  href="/admin/settlements/dues"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {t("states.detailError.back")}
                </Link>
              </div>
            ),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
        <ActionIconLink
          href="/admin/settlements/dues"
          intent="view"
          label={t("detail.back")}
          icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
          className="mb-3"
        />

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("detail.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("detail.title")}
            </h1>
            <p className="mt-2 font-mono text-sm text-text-secondary">{item.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BatchStatusChip status={item.status} />
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/10 dark:text-white/70">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              {formatSettlementMoney(locale, item.totalAmount, item.currency)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-text-brand dark:bg-primary/12 dark:text-primary-light">
              {t("detail.fields.itemsCount")}: {item.settlementItemsCount}
            </span>
          </div>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-text-secondary">
          {t("detail.note")}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ClarityTile
            title={t("detail.workflow.batchModeTitle")}
            note={t("detail.workflow.batchModeNote")}
          />
          <ClarityTile
            title={t("detail.workflow.autoIncludeTitle")}
            note={t("detail.workflow.autoIncludeNote")}
          />
          <ClarityTile
            title={t("detail.workflow.exceptionTitle")}
            note={t("detail.workflow.exceptionNote")}
          />
        </div>
      </SurfaceCard>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-700/30 dark:bg-green-900/10 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <SummaryCard title={t("detail.sections.batch")}>
            <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
              <DetailRow label={t("detail.fields.batchId")} value={item.id} mono />
              <DetailRow label={t("detail.fields.slug")} value={item.slug} mono />
              <DetailRow
                label={t("detail.fields.period")}
                value={`${item.periodYear}-${String(item.periodMonth).padStart(2, "0")}`}
              />
              <DetailRow
                label={t("detail.fields.status")}
                value={t(`statuses.${item.status}` as Parameters<typeof t>[0])}
              />
              <DetailRow label={t("detail.fields.currency")} value={item.currency} />
              <DetailRow
                label={t("detail.fields.totalAmount")}
                value={formatSettlementMoney(locale, item.totalAmount, item.currency)}
              />
              <DetailRow
                label={t("detail.fields.itemsCount")}
                value={String(item.settlementItemsCount)}
              />
              <DetailRow
                label={t("detail.fields.generatedAt")}
                value={formatSettlementDateTime(locale, item.generatedAt)}
              />
              <DetailRow
                label={t("detail.fields.finalizedAt")}
                value={formatSettlementDateTime(locale, item.finalizedAt)}
              />
              <DetailRow
                label={t("detail.fields.createdAt")}
                value={formatSettlementDateTime(locale, item.createdAt)}
              />
            </div>
          </SummaryCard>

          <SummaryCard title={t("detail.sections.summary")} note={t("detail.summaryNote")}>
            <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
              <DetailRow
                label={t("detail.summaryFields.settlementItemsCount")}
                value={String(item.summary.settlementItemsCount)}
              />
              <DetailRow
                label={t("detail.summaryFields.totalAmountNet")}
                value={formatSettlementMoney(locale, item.summary.totalAmountNet, item.currency)}
              />
              <DetailRow
                label={t("detail.summaryFields.draft")}
                value={String(item.summary.statusCounts.draft)}
              />
              <DetailRow
                label={t("detail.summaryFields.ready")}
                value={String(item.summary.statusCounts.ready)}
              />
              <DetailRow
                label={t("detail.summaryFields.processing")}
                value={String(item.summary.statusCounts.processing)}
              />
              <DetailRow
                label={t("detail.summaryFields.paid")}
                value={String(item.summary.statusCounts.paid)}
              />
              <DetailRow
                label={t("detail.summaryFields.failed")}
                value={String(item.summary.statusCounts.failed)}
              />
              <DetailRow
                label={t("detail.summaryFields.cancelled")}
                value={String(item.summary.statusCounts.cancelled)}
              />
            </div>
          </SummaryCard>

          <SummaryCard title={t("detail.sections.items")} note={t("detail.itemsNote")}>
            {hasItems ? (
              <div className="space-y-3">
                {item.items.map((settlement) => (
                  <div
                    key={settlement.id}
                    className="rounded-[24px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              ADMIN_SETTLEMENT_ITEM_STATUS_STYLES[settlement.status]
                            }`}
                          >
                            {t(`itemStatuses.${settlement.status}` as Parameters<typeof t>[0])}
                          </span>
                          <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
                            {settlement.currency}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                          {t("detail.itemTitle", {
                            id: settlement.practitionerId.slice(0, 8),
                          })}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                          <span>
                            {t("detail.itemFields.amountNet")}:{" "}
                            {formatSettlementMoney(locale, settlement.amountNet, settlement.currency)}
                          </span>
                          <span>
                            {t("detail.itemFields.amountGross")}:{" "}
                            {formatSettlementMoney(locale, settlement.amountGross, settlement.currency)}
                          </span>
                          <span>
                            {t("detail.itemFields.amountAdjustments")}:{" "}
                            {formatSettlementMoney(
                              locale,
                              settlement.amountAdjustments,
                              settlement.currency,
                            )}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                          <span>
                            {t("detail.itemFields.createdAt")}:{" "}
                            {formatSettlementDateTime(locale, settlement.createdAt)}
                          </span>
                          <span>
                            {t("detail.itemFields.paidAt")}:{" "}
                            {formatSettlementDateTime(locale, settlement.paidAt)}
                          </span>
                          <span>
                            {t("detail.itemFields.failedAt")}:{" "}
                            {formatSettlementDateTime(locale, settlement.failedAt)}
                          </span>
                        </div>

                        {settlement.payoutMethodSnapshot ? (
                          <div className="mt-3 rounded-2xl border border-border-light bg-surface-secondary/70 p-3 text-xs text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                            <p className="font-semibold text-text-primary dark:text-white/95">
                              {t("detail.itemFields.payoutMethodSnapshot")}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {"method" in settlement.payoutMethodSnapshot ? (
                                <span className="rounded-full bg-surface-tertiary px-2.5 py-1 font-semibold text-text-secondary dark:bg-white/8 dark:text-white/60">
                                  {String(settlement.payoutMethodSnapshot.method)}
                                </span>
                              ) : null}
                              {"source" in settlement.payoutMethodSnapshot ? (
                                <span className="rounded-full bg-surface-tertiary px-2.5 py-1 font-semibold text-text-secondary dark:bg-white/8 dark:text-white/60">
                                  {String(settlement.payoutMethodSnapshot.source)}
                                </span>
                              ) : null}
                              {"effectiveAt" in settlement.payoutMethodSnapshot ? (
                                <span className="rounded-full bg-surface-tertiary px-2.5 py-1 font-semibold text-text-secondary dark:bg-white/8 dark:text-white/60">
                                  {String(settlement.payoutMethodSnapshot.effectiveAt)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {settlement.externalPayoutRef ? (
                          <p className="mt-2 text-xs text-text-muted">
                            {t("detail.itemFields.externalPayoutRef", {
                              value: settlement.externalPayoutRef,
                            })}
                          </p>
                        ) : null}

                        {settlement.notes ? (
                          <p className="mt-2 text-xs text-text-secondary">
                            {t("detail.itemFields.notes", { value: settlement.notes })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBatchState t={t} />
            )}
          </SummaryCard>
        </div>

        <div className="space-y-5">
          <SummaryCard title={t("detail.sections.actions")} note={t("detail.actionsNote")}>
            {canOperate ? (
              <div className="space-y-6">
                {isEmptyBatch ? (
                  <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
                    <p className="font-semibold">{t("detail.emptyBatch.heading")}</p>
                    <p className="mt-2">{t("detail.actionsEmptyBatchNote")}</p>
                  </div>
                ) : null}

                <form onSubmit={handleMarkPaid} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("actions.markPaidTitle")}
                    </p>
                    {!actionState.canMarkPaid ? (
                      <span className="text-xs text-text-muted">{t("actions.notAvailable")}</span>
                    ) : null}
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("actions.externalPayoutRef")}
                    </span>
                    <input
                      value={paidRef}
                      onChange={(event) => setPaidRef(event.target.value)}
                      placeholder={t("actions.externalPayoutPlaceholder")}
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("actions.payoutMethod")}
                    </span>
                    <select
                      value={paidMethod}
                      onChange={(event) =>
                        setPaidMethod(event.target.value as SettlementPayoutMethod)
                      }
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    >
                      <option value="OTHER">{t("actions.payoutMethods.OTHER")}</option>
                      <option value="MANUAL_BANK_TRANSFER">
                        {t("actions.payoutMethods.MANUAL_BANK_TRANSFER")}
                      </option>
                      <option value="WALLET_TRANSFER">
                        {t("actions.payoutMethods.WALLET_TRANSFER")}
                      </option>
                      <option value="CASH">{t("actions.payoutMethods.CASH")}</option>
                    </select>
                  </label>
                  <DateTimeField
                    label={t("actions.effectiveAt")}
                    value={paidEffectiveAt}
                    onChange={setPaidEffectiveAt}
                    placeholder={t("actions.effectiveAtPlaceholder")}
                  />
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("actions.notes")}
                    </span>
                    <textarea
                      rows={3}
                      value={paidNotes}
                      onChange={(event) => setPaidNotes(event.target.value)}
                      placeholder={t("actions.notesPlaceholder")}
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                  </label>
                  <p className="text-xs leading-6 text-text-secondary">
                    {t("detail.actionMeaning.markPaid")}
                  </p>
                  <Button
                    type="submit"
                    disabled={!actionState.canMarkPaid || markPaidMutation.isPending}
                    startIcon={<BadgeDollarSign className="h-4 w-4" />}
                  >
                    {markPaidMutation.isPending
                      ? t("actions.markPaidSubmitting")
                      : t("actions.markPaid")}
                  </Button>
                </form>

                <form onSubmit={handleMarkFailed} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("actions.markFailedTitle")}
                    </p>
                    {!actionState.canMarkFailed ? (
                      <span className="text-xs text-text-muted">{t("actions.notAvailable")}</span>
                    ) : null}
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("actions.notes")}
                    </span>
                    <textarea
                      rows={3}
                      value={failedNotes}
                      onChange={(event) => setFailedNotes(event.target.value)}
                      placeholder={t("actions.notesPlaceholder")}
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                  </label>
                  <p className="text-xs leading-6 text-text-secondary">
                    {t("detail.actionMeaning.markFailed")}
                  </p>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={!actionState.canMarkFailed || markFailedMutation.isPending}
                    startIcon={<CircleOff className="h-4 w-4" />}
                    className="hover:border-rose-300 hover:text-rose-600"
                  >
                    {markFailedMutation.isPending
                      ? t("actions.markFailedSubmitting")
                      : t("actions.markFailed")}
                  </Button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t("actions.adminOnly")}</p>
            )}
          </SummaryCard>

          <SummaryCard title={t("detail.sections.boundary")} note={t("detail.boundaryNote")}>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>{t("detail.boundaryItems.noPayouts")}</li>
              <li>{t("detail.boundaryItems.noAdjustments")}</li>
              <li>{t("detail.boundaryItems.noAutoReconcile")}</li>
            </ul>
          </SummaryCard>
        </div>
      </div>
    </div>
  );
}
