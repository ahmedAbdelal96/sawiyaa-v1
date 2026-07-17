"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CircleCheckBig, CircleDashed, CircleX, RefreshCcw, Save } from "lucide-react";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { StateCard, ListStateSkeleton } from "@/components/shared/ContentStates";
import {
  AdminPageHeader,
  AdminStatsGrid,
  AdminMetricCard,
  AdminSectionCard,
  AdminStatusBadge,
  AdminTableSection,
} from "@/components/shared/admin/AdminDashboardKit";
import { ArrowLeft } from "lucide-react";
import { useAdminAcademyProgramAttendance, useSaveAdminAcademyProgramAttendance } from "../hooks/use-academy-programs";
import type {
  AcademyProgramAttendanceItem,
  AcademyProgramAttendanceStatus,
  AcademyProgramAttendanceSummary,
  SaveAdminAcademyProgramAttendanceStatus,
} from "../types/academy-programs.types";
import {
  resolveAcademyProgramDeliveryMethodLabel,
  resolveAcademyProgramDescription,
  resolveAcademyProgramSessionTitle,
  resolveAcademyProgramTitle,
} from "../lib/academy-program-localization";
import { getAcademyProgramErrorKey } from "../lib/academy-program-errors";
import { toAppError } from "@/lib/api/errors";
import AcademyProgramTabs from "./AcademyProgramTabs";

type Props = {
  programId: string;
};

type AttendanceFeedback = {
  tone: "success" | "error";
  message: string;
};

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatDateRange(startsAt: string | null | undefined, endsAt: string | null | undefined, locale: string) {
  const start = formatDateTime(startsAt, locale);
  const end = formatDateTime(endsAt, locale);

  if (start === "—" && end === "—") {
    return "—";
  }

  if (start === "—") {
    return end;
  }

  if (end === "—") {
    return start;
  }

  return `${start} → ${end}`;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function normalizeAttendanceStatus(status: AcademyProgramAttendanceStatus | null | undefined): SaveAdminAcademyProgramAttendanceStatus {
  if (status === "PRESENT" || status === "ABSENT") {
    return status;
  }

  return "UNMARKED";
}

function getStatusTone(status: SaveAdminAcademyProgramAttendanceStatus) {
  switch (status) {
    case "PRESENT":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ABSENT":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-border-light bg-surface-tertiary text-text-secondary";
  }
}

function getStatusButtonClass(
  value: SaveAdminAcademyProgramAttendanceStatus,
  selected: SaveAdminAcademyProgramAttendanceStatus,
) {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

  if (value === selected) {
    switch (value) {
      case "PRESENT":
        return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
      case "ABSENT":
        return `${base} border-rose-200 bg-rose-50 text-rose-700`;
      default:
        return `${base} border-border-light bg-white text-text-primary`;
    }
  }

  return `${base} border-border-light bg-white text-text-secondary hover:border-primary/25 hover:bg-surface-tertiary hover:text-text-primary`;
}

function resolveAttendanceSummaryLabel(summary: AcademyProgramAttendanceSummary | null | undefined, t: ReturnType<typeof useTranslations>) {
  if (!summary) {
    return t("admin.detail.attendance.summary.noSummary");
  }

  return t("admin.detail.attendance.summary.percentage", {
    value: formatPercent(summary.attendancePercentage),
  });
}

function AttendanceLearnerRow({
  item,
  locale,
  draftStatus,
  onChange,
}: {
  item: AcademyProgramAttendanceItem;
  locale: string;
  draftStatus: SaveAdminAcademyProgramAttendanceStatus;
  onChange: (status: SaveAdminAcademyProgramAttendanceStatus) => void;
}) {
  const t = useTranslations("academy");
  const currentStatus = normalizeAttendanceStatus(item.attendanceStatus);
  const statusLabel =
    currentStatus === "PRESENT"
      ? t("admin.detail.attendance.statuses.present")
      : currentStatus === "ABSENT"
        ? t("admin.detail.attendance.statuses.absent")
        : t("admin.detail.attendance.statuses.unmarked");

  return (
    <div className="grid gap-4 rounded-2xl border border-border-light bg-white p-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-text-primary">
            {item.learner.fullName}
          </h3>
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(currentStatus)}`}>
            {statusLabel}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          <span>{item.contactPhone}</span>
          {item.contactEmail ? <span className="truncate">{item.contactEmail}</span> : null}
          <span>{item.contactWhatsapp ?? item.learner.city ?? "—"}</span>
        </div>
          <p className="text-xs text-text-muted">
          {item.attendanceRecordId
            ? t("admin.detail.attendance.row.markedAt", {
                date: formatDateTime(item.markedAt, locale),
              })
            : t("admin.detail.attendance.row.notMarked")}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t("admin.detail.attendance.table.status")}
        </p>
        <p className="text-sm font-semibold text-text-primary">
          {t("admin.detail.attendance.row.currentState")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={() => onChange("PRESENT")}
          aria-pressed={draftStatus === "PRESENT"}
          className={getStatusButtonClass("PRESENT", draftStatus)}
        >
          <CircleCheckBig className="me-1 h-4 w-4" />
          {t("admin.detail.attendance.controls.present")}
        </button>
        <button
          type="button"
          onClick={() => onChange("ABSENT")}
          aria-pressed={draftStatus === "ABSENT"}
          className={getStatusButtonClass("ABSENT", draftStatus)}
        >
          <CircleX className="me-1 h-4 w-4" />
          {t("admin.detail.attendance.controls.absent")}
        </button>
        <button
          type="button"
          onClick={() => onChange("UNMARKED")}
          aria-pressed={draftStatus === "UNMARKED"}
          className={getStatusButtonClass("UNMARKED", draftStatus)}
        >
          <CircleDashed className="me-1 h-4 w-4" />
          {t("admin.detail.attendance.controls.clear")}
        </button>
      </div>
    </div>
  );
}

export default function AdminAcademyProgramAttendanceScreen({ programId }: Props) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const router = useRouter();
  const saveMutation = useSaveAdminAcademyProgramAttendance();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [draftStatusByEnrollmentId, setDraftStatusByEnrollmentId] = useState<
    Record<string, SaveAdminAcademyProgramAttendanceStatus>
  >({});
  const [feedback, setFeedback] = useState<AttendanceFeedback | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const lastHydratedSessionId = useRef<string | null>(null);

  const attendanceQuery = useAdminAcademyProgramAttendance(
    programId,
    selectedSessionId ? { sessionId: selectedSessionId } : undefined,
  );
  const attendance = attendanceQuery.data?.item ?? null;
  const sessions = attendance?.sessions ?? [];
  const effectiveSelectedSessionId = selectedSessionId ?? attendance?.selectedSessionId ?? null;
  const selectedSession =
    sessions.find((session) => session.id === effectiveSelectedSessionId) ??
    attendance?.selectedSession ??
    null;
  const items = attendance?.items ?? [];

  useEffect(() => {
    if (!attendance) {
      return;
    }

    const nextDrafts = Object.fromEntries(
      attendance.items.map((item) => [item.id, normalizeAttendanceStatus(item.attendanceStatus)]),
    );
    setDraftStatusByEnrollmentId(nextDrafts);

    if (lastHydratedSessionId.current !== attendance.selectedSessionId) {
      lastHydratedSessionId.current = attendance.selectedSessionId;
      setFeedback(null);
    }
  }, [attendance]);

  const changedItems = useMemo(
    () =>
      items
        .map((item) => {
          const currentStatus = normalizeAttendanceStatus(item.attendanceStatus);
          const draftStatus = draftStatusByEnrollmentId[item.id] ?? currentStatus;

          if (draftStatus === currentStatus) {
            return null;
          }

          return {
            enrollmentId: item.id,
            status: draftStatus,
          };
        })
        .filter((value): value is { enrollmentId: string; status: SaveAdminAcademyProgramAttendanceStatus } => Boolean(value)),
    [draftStatusByEnrollmentId, items],
  );

  const program = attendance?.program ?? null;
  const summary = attendance?.summary ?? null;
  const isCorrection = useMemo(
    () => changedItems.some((item) => Boolean(items.find((row) => row.id === item.enrollmentId)?.attendanceRecordId)),
    [changedItems, items],
  );
  const isSessionSwitching =
    attendanceQuery.isFetching &&
    Boolean(attendance?.selectedSessionId) &&
    selectedSessionId !== null &&
    selectedSessionId !== attendance?.selectedSessionId;

  const programTitle = program ? resolveAcademyProgramTitle(program, locale) : t("meta.adminProgramAttendanceTitle");
  const programDescription = program ? resolveAcademyProgramDescription(program, locale) : null;

  const handleSave = async () => {
    const sessionId = attendance?.selectedSessionId ?? selectedSessionId;
    if (!sessionId || changedItems.length === 0) {
      return;
    }
    if (isCorrection && !correctionReason.trim()) {
      setFeedback({
        tone: "error",
        message: t("admin.detail.attendance.feedback.correctionReasonRequired"),
      });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        programId,
        input: {
          sessionId,
          items: changedItems,
          reason: isCorrection ? correctionReason.trim() : undefined,
        },
      });
      setFeedback({
        tone: "success",
        message: t("admin.detail.attendance.feedback.saved"),
      });
    } catch (cause) {
      const appError = toAppError(cause);
      const errorKey = getAcademyProgramErrorKey(appError);
      setFeedback({
        tone: "error",
        message: t(errorKey as Parameters<typeof t>[0]),
      });
    }
  };

  const loading = attendanceQuery.isLoading || isSessionSwitching;
  const hasSessions = sessions.length > 0;
  const hasLearners = items.length > 0;
  const dirtyCount = changedItems.length;

  if (attendanceQuery.isError) {
    return (
      <StateCard
        title={t("admin.detail.attendance.states.error.title")}
        note={t("admin.detail.attendance.states.error.note")}
        action={{
          label: t("errors.retry"),
          onClick: () => attendanceQuery.refetch(),
        }}
        className="rounded-[30px]"
      />
    );
  }

  if (loading && !attendance) {
    return <ListStateSkeleton items={3} heightClass="h-36" />;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            startIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push(`/admin/academy/programs/${programId}` as never)}
          >
            {t("programs.learners.back")}
          </Button>
        </div>

        <AdminPageHeader
          eyebrow={t("programs.tabs.attendance")}
          title={programTitle}
          description={programDescription ?? t("admin.detail.attendance.note")}
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone="neutral">
                {t("admin.detail.attendance.meta.sessionCount", { count: sessions.length })}
              </AdminStatusBadge>
              {selectedSession ? (
                <AdminStatusBadge tone="primary">
                  {resolveAcademyProgramSessionTitle(selectedSession, locale)}
                </AdminStatusBadge>
              ) : null}
            </div>
          }
        />

        <div className="pt-2">
          <AcademyProgramTabs programId={programId} value="attendance" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
          <div className="rounded-xl border border-border-light bg-surface-secondary p-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.detail.attendance.sessionLabel")}
              </span>
              <Select
                defaultValue={effectiveSelectedSessionId ?? ""}
                onChange={(value) => {
                  setSelectedSessionId(value || null);
                  setFeedback(null);
                }}
                options={sessions.map((session) => ({
                  value: session.id,
                  label: `${session.sortOrder}. ${resolveAcademyProgramSessionTitle(session, locale)}`,
                }))}
                placeholder={t("admin.detail.attendance.sessionPlaceholder")}
                disabled={!hasSessions}
                className="h-12 w-full"
              />
            </label>

            {selectedSession ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary">
                  {formatDateRange(selectedSession.startsAt, selectedSession.endsAt, locale)}
                </span>
                <span className="rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary">
                  {resolveAcademyProgramDeliveryMethodLabel(selectedSession.deliveryMethod, t)}
                </span>
                <span className="rounded-full border border-border-light bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary">
                  {selectedSession.isPublished
                    ? t("admin.detail.attendance.sessionStates.published")
                    : t("admin.detail.attendance.sessionStates.draft")}
                </span>
              </div>
            ) : null}
            <p className="mt-4 text-xs leading-5 text-text-secondary">
              {t("admin.detail.attendance.sessionNote")}
            </p>
          </div>

          <AdminMetricCard
            label={t("admin.detail.attendance.summary.totalLearners")}
            value={String(summary?.totalLearners ?? 0)}
            tone="primary"
            icon={<CircleDashed className="h-4 w-4" />}
          />
          <AdminMetricCard
            label={t("admin.detail.attendance.summary.markedPresent")}
            value={String(summary?.markedPresent ?? 0)}
            tone="success"
            icon={<CircleCheckBig className="h-4 w-4" />}
          />
          <AdminMetricCard
            label={t("admin.detail.attendance.summary.markedAbsent")}
            value={String(summary?.markedAbsent ?? 0)}
            tone="warning"
            icon={<CircleX className="h-4 w-4" />}
          />
          <AdminMetricCard
            label={t("admin.detail.attendance.summary.unmarked")}
            value={String(summary?.unmarked ?? 0)}
            tone="neutral"
            icon={<RefreshCcw className="h-4 w-4" />}
            hint={resolveAttendanceSummaryLabel(summary, t)}
          />
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <AdminTableSection
        title={t("admin.detail.attendance.table.title")}
        subtitle={
          <div className="space-y-1">
            <p>{t("admin.detail.attendance.table.note")}</p>
            <p className="text-xs font-medium text-text-muted">
              {dirtyCount > 0
                ? t("admin.detail.attendance.feedback.pending", { count: dirtyCount })
                : t("admin.detail.attendance.feedback.noChanges")}
            </p>
            {isCorrection ? (
              <textarea
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder={t("admin.detail.attendance.feedback.correctionReasonPlaceholder")}
                className="mt-2 w-full rounded-xl border border-border-light bg-white px-3 py-2 text-xs text-text-primary outline-none focus:border-primary"
              />
            ) : null}
          </div>
        }
        actions={
          <Button
            onClick={handleSave}
            disabled={dirtyCount === 0 || saveMutation.isPending || !attendance || loading}
            startIcon={<Save className="h-4 w-4" />}
          >
            {saveMutation.isPending
              ? t("admin.detail.attendance.actions.saving")
              : t("admin.detail.attendance.actions.save")}
          </Button>
        }
        flushContent
      >
        {loading ? (
          <div className="p-5">
            <ListStateSkeleton items={3} heightClass="h-28" />
          </div>
        ) : !hasSessions ? (
          <div className="p-5">
            <StateCard
              title={t("admin.detail.attendance.states.noSessions.title")}
              note={t("admin.detail.attendance.states.noSessions.note")}
              centered={false}
              className="rounded-[24px]"
            />
          </div>
        ) : hasLearners ? (
          <div className="overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_auto] border-b border-border-light px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted lg:grid">
              <div>{t("admin.detail.attendance.table.learner")}</div>
              <div>{t("admin.detail.attendance.table.status")}</div>
              <div className="text-end">{t("admin.detail.attendance.table.actions")}</div>
            </div>

            <div className="divide-y divide-border-light">
              {items.map((item) => {
                const currentStatus = normalizeAttendanceStatus(item.attendanceStatus);
                const draftStatus = draftStatusByEnrollmentId[item.id] ?? currentStatus;

                return (
                  <AttendanceLearnerRow
                    key={item.id}
                    item={item}
                    locale={locale}
                    draftStatus={draftStatus}
                    onChange={(status) =>
                      setDraftStatusByEnrollmentId((current) => ({
                        ...current,
                        [item.id]: status,
                      }))
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-5">
            <StateCard
              title={t("admin.detail.attendance.states.emptyLearners.title")}
              note={t("admin.detail.attendance.states.emptyLearners.note")}
              centered={false}
              className="rounded-[24px]"
            />
          </div>
        )}
      </AdminTableSection>
    </div>
  );
}
