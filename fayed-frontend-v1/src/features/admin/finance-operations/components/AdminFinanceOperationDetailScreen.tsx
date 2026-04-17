"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, ArrowRight } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import { useAdminFinanceOperationEvent } from "../hooks/use-admin-finance-operations";
import { getAdminFinanceOperationsErrorKey } from "../lib/admin-finance-operations-errors";
import type { FinanceOperationEventItem } from "../types/admin-finance-operations.types";

type Props = {
  eventId: string;
};

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className={`text-sm text-text-primary dark:text-white/90 ${mono ? "font-mono text-xs sm:text-sm" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function toViewValue(value: string | null) {
  return value ?? "-";
}

function OperationalSnapshot({ item }: { item: FinanceOperationEventItem }) {
  const t = useTranslations("admin-finance-operations");

  const lifecycleKey =
    item.operationType === "REFUND"
      ? item.refundStatus === "FAILED"
        ? "refundFailed"
        : item.refundStatus === "SUCCEEDED"
          ? "refundSucceeded"
          : "refundInFlight"
      : item.paymentStatus === "FAILED"
        ? "paymentFailed"
        : item.paymentStatus === "CAPTURED" || item.paymentStatus === "REFUNDED" || item.paymentStatus === "PARTIALLY_REFUNDED"
          ? "paymentRecorded"
          : "paymentPending";

  return (
    <section className="app-panel rounded-[28px] p-5">
      <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
        {t("detail.snapshot.heading")}
      </h2>
      <p className="mt-1 text-sm leading-6 text-text-secondary">{t("detail.snapshot.note")}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[24px] border border-border-light bg-surface-primary px-4 py-4 dark:border-white/8 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("detail.snapshot.operationType")}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {t(`types.${item.operationType}` as Parameters<typeof t>[0])}
          </p>
        </div>
        <div className="rounded-[24px] border border-border-light bg-surface-primary px-4 py-4 dark:border-white/8 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("detail.snapshot.lifecycle")}
          </p>
          <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
            {t(`detail.lifecycle.${lifecycleKey}.title` as Parameters<typeof t>[0])}
          </p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {t(`detail.lifecycle.${lifecycleKey}.note` as Parameters<typeof t>[0])}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function AdminFinanceOperationDetailScreen({ eventId }: Props) {
  const t = useTranslations("admin-finance-operations");
  const locale = useLocale();
  const event = useAdminFinanceOperationEvent(eventId);

  if (event.isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-28" />;
  }

  if (event.isError || !event.data) {
    const errorKey = getAdminFinanceOperationsErrorKey(event.error);
    return (
      <StateCard
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        title={t("states.detailError.heading")}
        note={t(errorKey as Parameters<typeof t>[0])}
        action={{
          label: t("states.detailError.back"),
          href: (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => event.refetch()}
                className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
              >
                {t("states.detailError.retry")}
              </button>
              <Link
                href="/admin/admin-operations"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("states.detailError.back")}
              </Link>
            </div>
          ),
        }}
      />
    );
  }

  const item = event.data.item;

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <ActionIconLink
          href="/admin/admin-operations"
          intent="view"
          label={t("detail.back")}
          icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
          className="mb-3"
        />

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("detail.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
          {t("detail.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
          {t("detail.note")}
        </p>
      </section>

      <OperationalSnapshot item={item} />

      <section className="app-panel rounded-[28px] p-5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("detail.fields.heading")}
        </h2>

        <div className="mt-4 rounded-[24px] border border-border-light px-4 dark:border-white/8">
          <DetailField label={t("detail.fields.id")} value={item.id} mono />
          <DetailField
            label={t("detail.fields.operationType")}
            value={t(`types.${item.operationType}` as Parameters<typeof t>[0])}
          />
          <DetailField label={t("detail.fields.summary")} value={toViewValue(item.summary)} />
          <DetailField label={t("detail.fields.provider")} value={item.provider ? t(`providers.${item.provider}` as Parameters<typeof t>[0]) : "-"} />
          <DetailField
            label={t("detail.fields.paymentPurpose")}
            value={item.paymentPurpose ? t(`paymentPurposes.${item.paymentPurpose}` as Parameters<typeof t>[0]) : "-"}
          />
          <DetailField
            label={t("detail.fields.paymentStatus")}
            value={item.paymentStatus ? t(`paymentStatuses.${item.paymentStatus}` as Parameters<typeof t>[0]) : "-"}
          />
          <DetailField
            label={t("detail.fields.refundStatus")}
            value={item.refundStatus ? t(`refundStatuses.${item.refundStatus}` as Parameters<typeof t>[0]) : "-"}
          />
          <DetailField label={t("detail.fields.paymentId")} value={toViewValue(item.paymentId)} mono />
          <DetailField label={t("detail.fields.refundId")} value={toViewValue(item.refundId)} mono />
          <DetailField label={t("detail.fields.externalRef")} value={toViewValue(item.externalRef)} mono />
          <DetailField label={t("detail.fields.linkedSessionId")} value={toViewValue(item.linkedSessionId)} mono />
          <DetailField label={t("detail.fields.linkedPractitionerId")} value={toViewValue(item.linkedPractitionerId)} mono />
          <DetailField label={t("detail.fields.occurredAt")} value={formatDateTime(item.occurredAt, locale)} />
          <DetailField label={t("detail.fields.createdAt")} value={formatDateTime(item.createdAt, locale)} />
        </div>
      </section>
    </div>
  );
}
