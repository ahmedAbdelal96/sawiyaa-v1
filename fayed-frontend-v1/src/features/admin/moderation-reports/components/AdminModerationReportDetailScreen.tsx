"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Mail, Phone, ShieldCheck, ShieldX, UserRound } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import Button from "@/components/ui/button/Button";
import { useAuthState } from "@/stores/auth-store";
import { toAppError } from "@/lib/api/errors";
import { listAdminPatients } from "@/features/admin/patients/api/admin-patients.api";
import { getAdminSupportTicket } from "@/features/support/api/support.api";
import { useCreateAdminSupportTicketForReporter } from "@/features/support/hooks/use-support";
import {
  ADMIN_MODERATION_STATUS_STYLES,
  doesActionRequireReason,
  getAdminModerationErrorKey,
  getAllowedModerationActions,
} from "../lib/admin-moderation-reports";
import {
  useAdminModerationReportDetail,
  useExecuteAdminModerationAction,
} from "../hooks/use-admin-moderation-reports";
import type {
  ModerationCaseActionType,
  ModerationCaseDetail,
  ModerationTargetSnapshot,
} from "../types/admin-moderation-reports.types";

type Props = {
  reportId: string;
};

const OPERATOR_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "SUPPORT_AGENT",
  "CONTENT_REVIEWER",
]);

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

function formatSnapshotLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSnapshotValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value || "-";
  if (typeof value === "number") return Number.isNaN(value) ? "-" : String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "-";
    }
  }
  return String(value);
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
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">{title}</h2>
      {note ? <p className="mt-1 text-sm leading-6 text-text-secondary">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </SurfaceCard>
  );
}

function ReporterQuickActions({
  displayName,
  email,
  phone,
  patientProfileId,
  practitionerProfileId,
}: {
  displayName: string | null;
  email: string | null;
  phone: string | null;
  patientProfileId: string | null;
  practitionerProfileId: string | null;
}) {
  const primaryHref = patientProfileId
    ? `/admin/patients/${patientProfileId}`
    : practitionerProfileId
      ? `/admin/practitioners/${practitionerProfileId}`
      : null;

  const actionClassName =
    "inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_10px_20px_-16px_rgba(34,52,56,0.08)] transition hover:border-primary/30 hover:bg-brand-25 dark:border-white/8 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/8";

  return (
    <div className="mt-3 flex flex-wrap gap-2 items-center">
      {primaryHref ? (
        <Link href={primaryHref as never} className={actionClassName}>
          <UserRound className="h-4 w-4 text-primary" />
          {displayName || "Profile"}
        </Link>
      ) : null}

      {email ? (
        <a href={`mailto:${email}`} className={actionClassName}>
          <Mail className="h-4 w-4 text-primary" />
          {email}
        </a>
      ) : null}

      {phone ? (
        <a href={`tel:${phone}`} className={actionClassName}>
          <Phone className="h-4 w-4 text-primary" />
          {phone}
        </a>
      ) : null}
    </div>
  );
}

function TargetQuickActions({
  onOpenSupport,
  isOpeningSupport,
  t,
}: {
  onOpenSupport: () => Promise<void>;
  isOpeningSupport: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          void onOpenSupport();
        }}
        disabled={isOpeningSupport}
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_22px_-16px_rgba(68,161,148,0.38)] transition hover:bg-primary-hover"
      >
        {isOpeningSupport ? t("actions.submitting") : t("detail.actions.openSupportChat")}
      </button>
    </div>
  );
}

function resolveSupportHref(item: ModerationCaseDetail | undefined) {
  if (!item) return "/admin/support";

  if (item.targetType === "SUPPORT_TICKET") {
    return `/admin/support/${item.targetId}`;
  }

  if (item.targetType === "SUPPORT_MESSAGE") {
    const ticketId = item.targetSnapshot?.context?.supportTicketId;
    if (typeof ticketId === "string" && ticketId.trim().length > 0) {
      return `/admin/support/${ticketId}`;
    }
  }

  if (item.reporterUserId) {
    return `/admin/support?reporterUserId=${encodeURIComponent(item.reporterUserId)}`;
  }

  return "/admin/support";
}

function resolveDirectSupportTicketId(item: ModerationCaseDetail | undefined) {
  if (!item) return null;
  if (item.targetType === "SUPPORT_TICKET") return item.targetId;

  if (item.targetType === "SUPPORT_MESSAGE") {
    const ticketId = item.targetSnapshot?.context?.supportTicketId;
    if (typeof ticketId === "string" && ticketId.trim().length > 0) {
      return ticketId;
    }
  }

  return null;
}

function useResolvedReporter(item: ModerationCaseDetail | undefined) {
  const backendReporter = item?.reporter ?? null;
  const hasBackendIdentity =
    Boolean(backendReporter?.displayName) ||
    Boolean(backendReporter?.email) ||
    Boolean(backendReporter?.phone) ||
    Boolean(backendReporter?.patientProfileId) ||
    Boolean(backendReporter?.practitionerProfileId);
  const shouldFallback =
    Boolean(item) &&
    (!backendReporter || !hasBackendIdentity) &&
    item?.reporterRole === "PATIENT" &&
    Boolean(item?.reporterUserId);

  const fallbackQuery = useQuery({
    queryKey: ["adminModeration", "reporterFallbackPatient", item?.reporterUserId ?? ""],
    enabled: shouldFallback,
    queryFn: async () => {
      const reporterUserId = item?.reporterUserId;
      if (!reporterUserId) return null;
      const data = await listAdminPatients({
        search: reporterUserId,
        page: 1,
        limit: 10,
      });
      const match = data.items.find((candidate) => candidate.userId === reporterUserId);
      if (!match) return null;

      return {
        userId: match.userId,
        displayName: match.displayName,
        email: match.primaryEmail,
        phone: match.primaryPhone,
        patientProfileId: match.id,
        practitionerProfileId: null,
      } satisfies NonNullable<ModerationCaseDetail["reporter"]>;
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  return {
    reporter: hasBackendIdentity ? backendReporter : fallbackQuery.data ?? backendReporter ?? null,
    isLoadingFallback: shouldFallback && fallbackQuery.isFetching,
    fallbackError: fallbackQuery.error ? toAppError(fallbackQuery.error) : null,
    shouldFallback,
    hasBackendIdentity,
    backendReporter,
  };
}

function OperationalCard({
  label,
  title,
  tone = "neutral",
}: {
  label: string;
  title: string;
  tone?: "neutral" | "brand" | "primary" | "success" | "warning";
}) {
  return (
    <SurfaceStatCard label={label} value={title} tone={tone} />
  );
}

function SnapshotPanel({
  snapshot,
  t,
}: {
  snapshot: ModerationTargetSnapshot | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!snapshot) {
    return (
      <StateCard
        title={t("detail.snapshot.emptyHeading")}
        note={t("detail.snapshot.emptyNote")}
      />
    );
  }

  const entries = Object.entries(snapshot.context ?? {});
  if (entries.length === 0) {
    return (
      <StateCard
        title={t("detail.snapshot.emptyHeading")}
        note={t("detail.snapshot.emptyNote")}
      />
    );
  }

  return (
    <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
      {entries.map(([key, value]) => (
        <DetailRow key={key} label={formatSnapshotLabel(key)} value={formatSnapshotValue(value)} />
      ))}
    </div>
  );
}

function getAllowedActions(item: ModerationCaseDetail, role?: string | null) {
  return getAllowedModerationActions({
    status: item.status,
    targetType: item.targetType,
    role,
  });
}

function getModerationCaseState(item: ModerationCaseDetail) {
  switch (item.status) {
    case "OPEN":
      return "open" as const;
    case "UNDER_REVIEW":
      return "review" as const;
    case "READY_FOR_ENFORCEMENT":
      return "enforcement" as const;
    case "RESOLVED":
      return "resolved" as const;
    case "DISMISSED":
      return "dismissed" as const;
  }
}

function getModerationTargetState(item: ModerationCaseDetail) {
  return item.targetSnapshot ? ("snapshotPresent" as const) : ("snapshotMissing" as const);
}

function getModerationActionPosture(input: {
  canOperate: boolean;
  availableActions: ModerationCaseActionType[];
}) {
  if (!input.canOperate) return "inspectionOnly" as const;
  if (input.availableActions.length > 0) return "limitedActions" as const;
  return "noActions" as const;
}

function OperationalSnapshot({
  item,
  canOperate,
  availableActions,
  t,
}: {
  item: ModerationCaseDetail;
  canOperate: boolean;
  availableActions: ModerationCaseActionType[];
  t: ReturnType<typeof useTranslations>;
}) {
  const caseState = getModerationCaseState(item);
  const targetState = getModerationTargetState(item);
  const actionPosture = getModerationActionPosture({ canOperate, availableActions });
  const caseTone =
    caseState === "resolved"
      ? "success"
      : caseState === "enforcement"
        ? "brand"
        : caseState === "review"
          ? "primary"
          : caseState === "open"
            ? "warning"
            : "neutral";
  const targetTone = targetState === "snapshotPresent" ? "brand" : "warning";
  const actionTone =
    actionPosture === "limitedActions"
      ? "primary"
      : actionPosture === "inspectionOnly"
        ? "neutral"
        : "warning";

  return (
    <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
        {t("detail.sections.snapshotSummary")}
      </h2>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <OperationalCard
          label={t("detail.snapshotCards.caseState.label")}
          title={t(`detail.snapshotCards.caseState.states.${caseState}.title` as Parameters<typeof t>[0])}
          tone={caseTone}
        />
        <OperationalCard
          label={t("detail.snapshotCards.targetContext.label")}
          title={t(`detail.snapshotCards.targetContext.states.${targetState}.title` as Parameters<typeof t>[0])}
          tone={targetTone}
        />
        <OperationalCard
          label={t("detail.snapshotCards.actionPosture.label")}
          title={t(`detail.snapshotCards.actionPosture.states.${actionPosture}.title` as Parameters<typeof t>[0])}
          tone={actionTone}
        />
      </div>
    </SurfaceCard>
  );
}

export default function AdminModerationReportDetailScreen({ reportId }: Props) {
  const t = useTranslations("admin-moderation-reports");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthState();
  const canOperate = user?.role ? OPERATOR_ROLES.has(user.role) : false;
  const createOutreachTicket = useCreateAdminSupportTicketForReporter();

  const reportQuery = useAdminModerationReportDetail(reportId);
  const executeAction = useExecuteAdminModerationAction();

  const [selectedAction, setSelectedAction] = useState<ModerationCaseActionType | "">("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  const item = reportQuery.data?.item;
  const resolvedReporter = useResolvedReporter(item);

  const supportHref = useMemo(() => resolveSupportHref(item), [item]);
  const directSupportTicketId = useMemo(() => resolveDirectSupportTicketId(item), [item]);

  const availableActions = useMemo(() => {
    if (!item) return [];
    return getAllowedActions(item, user?.role ?? null);
  }, [item, user?.role]);

  const handleOpenSupport = async () => {
    if (!item) return;

    if (directSupportTicketId) {
      try {
        await getAdminSupportTicket(directSupportTicketId);
        router.push(`/admin/support/${directSupportTicketId}` as never);
        return;
      } catch {
        // If the referenced ticket is missing or inaccessible, fallback to creating a fresh outreach thread.
      }
    }

    if (
      item.reporterUserId &&
      (item.reporterRole === "PATIENT" || item.reporterRole === "PRACTITIONER")
    ) {
      try {
        const created = await createOutreachTicket.mutateAsync({
          reporterUserId: item.reporterUserId,
          reporterRole: item.reporterRole,
          category: "GENERAL",
          subject: "متابعة من فريق الدعم بخصوص البلاغ",
          description: "مرحبًا، نحتاج بعض التفاصيل الإضافية لمتابعة البلاغ وحل المشكلة بأسرع وقت.",
          priority: "NORMAL",
        });
        router.push(`/admin/support/${created.item.id}` as never);
        return;
      } catch {
        router.push("/admin/support" as never);
        return;
      }
    }

    router.push("/admin/support" as never);
  };

  const reasonRequired = selectedAction ? doesActionRequireReason(selectedAction) : false;

  const handleActionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;
    setFeedback(null);

    if (!selectedAction) {
      setFeedback({ tone: "error", message: t("actions.validation.select") });
      return;
    }

    if (reasonRequired && !reason.trim()) {
      setFeedback({ tone: "error", message: t("actions.validation.reasonRequired") });
      return;
    }

    try {
      await executeAction.mutateAsync({
        reportId: item.id,
        payload: {
          action: selectedAction,
          reason: reason.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      setFeedback({ tone: "success", message: t("actions.success") });
      setReason("");
      setNote("");
      setSelectedAction("");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminModerationErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  if (reportQuery.isLoading) {
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

  if (reportQuery.isError || !item) {
    const error = reportQuery.error ? toAppError(reportQuery.error) : null;
    const isNotFound =
      error?.statusCode === 404 ||
      error?.code === "MODERATION_REPORT_NOT_FOUND_IN_SCOPE" ||
      error?.code === "MODERATION_CASE_NOT_FOUND";

    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<ShieldX className="h-8 w-8 text-text-muted" />}
          title={
            isNotFound
              ? t("states.notFound.heading")
              : t("states.detailError.heading")
          }
          note={
            isNotFound ? t("states.notFound.note") : t("states.detailError.note")
          }
          action={{
            label: t("states.detailError.back"),
            href: (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!isNotFound ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reportQuery.refetch()}
                  >
                    {t("states.detailError.retry")}
                  </Button>
                ) : null}
                <Link
                  href="/admin/moderation/reports"
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
          href="/admin/moderation/reports"
          intent="view"
          label={t("detail.back")}
          icon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
          className="mb-3"
        />

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("detail.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("detail.title")}
            </h1>
            <p className="mt-2 font-mono text-sm text-text-secondary">{item.id}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${ADMIN_MODERATION_STATUS_STYLES[item.status]}`}
          >
            {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
          </span>
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

      <OperationalSnapshot
        item={item}
        canOperate={canOperate}
        availableActions={availableActions}
        t={t}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <SummaryCard title={t("detail.sections.case")}>
            <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
              <DetailRow label={t("detail.fields.reportId")} value={item.id} mono />
              <DetailRow
                label={t("detail.fields.status")}
                value={t(`statuses.${item.status}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("detail.fields.targetType")}
                value={t(`targetTypes.${item.targetType}` as Parameters<typeof t>[0])}
              />
              <DetailRow label={t("detail.fields.targetId")} value={item.targetId} mono />
              <DetailRow
                label={t("detail.fields.reason")}
                value={t(`reasons.${item.reason}` as Parameters<typeof t>[0])}
              />
              <DetailRow
                label={t("detail.fields.createdAt")}
                value={formatDateTime(item.createdAt, locale)}
              />
              <DetailRow
                label={t("detail.fields.lastActionAt")}
                value={formatDateTime(item.lastActionAt, locale)}
              />
            </div>
          </SummaryCard>

          <SummaryCard title={t("detail.sections.reporter")}>
            <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
              <DetailRow
                label={t("detail.fields.reporterRole")}
                value={t(
                  `reporterRoles.${item.reporterRole}` as Parameters<typeof t>[0],
                )}
              />
              <DetailRow
                label={t("detail.fields.reporterUserId")}
                value={
                  resolvedReporter.reporter?.userId ??
                  item.reporterUserId ??
                  t("detail.fields.noReporter")
                }
                mono
              />
              <DetailRow
                label={t("detail.fields.reporterName")}
                value={resolvedReporter.reporter?.displayName ?? "-"}
              />
              <DetailRow
                label={t("detail.fields.reporterEmail")}
                value={resolvedReporter.reporter?.email ?? "-"}
              />
              <DetailRow
                label={t("detail.fields.reporterPhone")}
                value={resolvedReporter.reporter?.phone ?? "-"}
              />
              <DetailRow
                label={t("detail.fields.note")}
                value={item.note ?? t("detail.fields.noNote")}
              />
            </div>

            {resolvedReporter.isLoadingFallback ? (
              <p className="mt-3 text-xs text-text-muted">{t("list.countLoading")}</p>
            ) : null}

            {resolvedReporter.reporter ? (
              <ReporterQuickActions
                displayName={resolvedReporter.reporter.displayName}
                email={resolvedReporter.reporter.email}
                phone={resolvedReporter.reporter.phone}
                patientProfileId={resolvedReporter.reporter.patientProfileId}
                practitionerProfileId={resolvedReporter.reporter.practitionerProfileId}
              />
            ) : null}

            <TargetQuickActions
              onOpenSupport={handleOpenSupport}
              isOpeningSupport={createOutreachTicket.isPending}
              t={t}
            />
          </SummaryCard>

          <SummaryCard title={t("detail.sections.snapshot")}>
            <SnapshotPanel snapshot={item.targetSnapshot} t={t} />
          </SummaryCard>
        </div>

        <div className="space-y-5">
          <SummaryCard title={t("detail.sections.actions")}>
            {canOperate ? (
              availableActions.length > 0 ? (
                <form onSubmit={handleActionSubmit} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("actions.fields.action")}
                    </span>
                    <select
                      value={selectedAction}
                      onChange={(event) =>
                        setSelectedAction(
                          event.target.value as ModerationCaseActionType | "",
                        )
                      }
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    >
                      <option value="">{t("actions.placeholders.selectAction")}</option>
                      {availableActions.map((action) => (
                        <option key={action} value={action}>
                          {t(`actions.options.${action}` as Parameters<typeof t>[0])}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("actions.fields.reason")}
                    </span>
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={
                        reasonRequired
                          ? t("actions.placeholders.reasonRequired")
                          : t("actions.placeholders.reasonOptional")
                      }
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                    {reasonRequired ? (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        {t("actions.reasonRequiredNote")}
                      </p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {t("actions.fields.note")}
                    </span>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t("actions.placeholders.note")}
                      className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
                    />
                  </label>

                  <Button
                    type="submit"
                    disabled={executeAction.isPending}
                    className="w-full sm:w-auto"
                    startIcon={<ShieldCheck className="h-4 w-4" />}
                  >
                    {executeAction.isPending
                      ? t("actions.submitting")
                      : t("actions.submit")}
                  </Button>
                </form>
              ) : (
                <StateCard
                  title={t("actions.states.noActions.heading")}
                  note={t("actions.states.noActions.note")}
                />
              )
            ) : (
              <StateCard
                title={t("actions.states.notAuthorized.heading")}
                note={t("actions.states.notAuthorized.note")}
              />
            )}
          </SummaryCard>

        </div>
      </div>
    </div>
  );
}
