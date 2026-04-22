"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Activity, MonitorPlay, Radar } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { getAdminSessionRuntimeErrorKey } from "../lib/admin-session-runtime-errors";
import { useAdminSessionRuntimeInspection } from "../hooks/use-admin-session-runtime";
import AdminSessionAttendanceSection from "./AdminSessionAttendanceSection";
import type {
  AdminSessionJoinBlockedReason,
  AdminSessionRuntimeInspectionItem,
  AdminSessionStatus,
} from "../types/admin-session-runtime.types";

const STATUS_STYLES: Partial<Record<AdminSessionStatus, string>> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  CONFIRMED: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  UPCOMING: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  READY_TO_JOIN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  IN_PROGRESS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  COMPLETED: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  NO_SHOW: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  REFUNDED: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-white/70",
};

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

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
        className={`text-sm text-text-primary dark:text-white/90 ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">{title}</h2>
      {note ? <p className="mt-1 text-sm leading-6 text-text-secondary">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RuntimeSummary({ item }: { item: AdminSessionRuntimeInspectionItem }) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();

  return (
    <SectionCard title={t("sections.summary.title")}>
      <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
        <DetailRow label={t("fields.id")} value={item.id} mono />
        <DetailRow
          label={t("fields.status")}
          value={t(`statuses.${item.status}` as Parameters<typeof t>[0])}
        />
        <DetailRow
          label={t("fields.mode")}
          value={t(`modes.${item.sessionMode}` as Parameters<typeof t>[0])}
        />
        <DetailRow
          label={t("fields.scheduledStartAt")}
          value={formatDateTime(item.scheduledStartAt, locale)}
        />
        <DetailRow
          label={t("fields.scheduledEndAt")}
          value={formatDateTime(item.scheduledEndAt, locale)}
        />
      </div>
    </SectionCard>
  );
}

function ProviderSummary({ item }: { item: AdminSessionRuntimeInspectionItem }) {
  const t = useTranslations("admin-session-runtime");

  return (
    <SectionCard title={t("sections.provider.title")}>
      <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
        <DetailRow
          label={t("fields.provider")}
          value={t(`providers.${item.provider}` as Parameters<typeof t>[0])}
        />
        <DetailRow
          label={t("fields.providerRoomId")}
          value={item.providerRoomId ?? "-"}
          mono
        />
        <DetailRow
          label={t("fields.providerSessionRef")}
          value={item.providerSessionRef ?? "-"}
          mono
        />
      </div>
    </SectionCard>
  );
}

function ReadinessSummary({
  item,
}: {
  item: AdminSessionRuntimeInspectionItem;
}) {
  const t = useTranslations("admin-session-runtime");
  const blockedReason =
    item.blockedReason ??
    ("NONE" as AdminSessionJoinBlockedReason | "NONE");

  return (
    <SectionCard title={t("sections.readiness.title")}>
      <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
        <DetailRow
          label={t("fields.canPrepareRuntime")}
          value={item.canPrepareRuntime ? t("labels.yes") : t("labels.no")}
        />
        <DetailRow
          label={t("fields.canJoin")}
          value={item.canJoin ? t("labels.yes") : t("labels.no")}
        />
        <DetailRow
          label={t("fields.blockedReason")}
          value={t(
            `blockedReasons.${blockedReason}` as Parameters<typeof t>[0],
          )}
        />
      </div>
    </SectionCard>
  );
}

export default function AdminSessionRuntimeInspectionScreen({
  initialSessionId,
}: {
  initialSessionId?: string;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();
  const [sessionId, setSessionId] = useState(initialSessionId ?? "");
  const [submittedId, setSubmittedId] = useState(initialSessionId ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const inspection = useAdminSessionRuntimeInspection(submittedId, Boolean(submittedId));
  const item = inspection.data?.item;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = sessionId.trim();
    if (!trimmed) {
      setLocalError(t("states.empty.heading"));
      setSubmittedId("");
      return;
    }
    setLocalError(null);
    setSubmittedId(trimmed);
  };

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("page.title")}
            </h1>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {submittedId ? t("page.active") : t("page.waiting")}
          </span>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
              {t("lookup.heading")}
            </h2>
          </div>
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary"
          >
            <DirectionalArrowIcon direction="back" className="h-3.5 w-3.5" />
            {t("lookup.backToPayments")}
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("lookup.fieldLabel")}
            </span>
            <input
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder={t("lookup.placeholder")}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Radar className="h-4 w-4" />
            {t("lookup.submit")}
          </button>
        </form>

        {localError ? (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{localError}</p>
        ) : null}
      </section>

      {!submittedId ? (
        <StateCard
          icon={<MonitorPlay className="h-5 w-5 text-primary" />}
          title={t("states.empty.heading")}
          note={t("states.empty.note")}
          className="rounded-[28px] p-8"
        />
      ) : inspection.isLoading ? (
        <ListStateSkeleton items={3} heightClass="h-24" />
      ) : inspection.isError ? (
        <StateCard
          icon={<Activity className="h-5 w-5 text-primary" />}
          title={t("states.error.heading")}
          note={t(getAdminSessionRuntimeErrorKey(inspection.error) as Parameters<typeof t>[0])}
          action={{
            label: t("states.error.retry"),
            onClick: () => inspection.refetch(),
          }}
          className="rounded-[28px]"
        />
      ) : item ? (
        <div className="space-y-5">
          <section className="app-panel rounded-[28px] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("result.eyebrow")}
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-text-primary dark:text-white/95">
                  {t("result.title")}
                </h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLES[item.status] ??
                  "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/70"
                }`}
              >
                {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
              </span>
            </div>
          </section>

          <AdminSessionAttendanceSection sessionId={item.id} enabled={Boolean(submittedId)} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.9fr)]">
            <div className="space-y-5">
              <RuntimeSummary item={item} />
            </div>
            <div className="space-y-5">
              <ReadinessSummary item={item} />
            </div>
          </div>

          <ProviderSummary item={item} />
        </div>
      ) : (
        <StateCard
          icon={<MonitorPlay className="h-5 w-5 text-primary" />}
          title={t("states.notFound.heading")}
          note={t("states.notFound.note")}
          className="rounded-[28px] p-8"
        />
      )}

    </div>
  );
}
