"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CircleOff,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { useAuthState } from "@/stores/auth-store";
import {
  useAdminAcademyProgram,
  useArchiveAdminAcademyProgram,
  usePublishAdminAcademyProgram,
  useUpdateAdminAcademyProgram,
} from "../hooks/use-academy-programs";
import { getAcademyProgramErrorKey } from "../lib/academy-program-errors";
import {
  AdminPageHeader,
  AdminStatsGrid,
  AdminMetricCard,
  AdminSectionCard,
  AdminStatusBadge,
  AdminTableSection,
} from "@/components/shared/admin/AdminDashboardKit";
import { CheckCircle, Users, BookOpen } from "lucide-react";
import AcademyProgramTabs from "./AcademyProgramTabs";
import {
  resolveAcademyProgramCategoryTitle,
  resolveAcademyProgramDescription,
  resolveAcademyProgramSessionTitle,
  resolveAcademyProgramTitle,
} from "../lib/academy-program-localization";
import type { AcademyProgramItem, AcademyProgramSessionItem } from "../types/academy-programs.types";
import AdminAcademyProgramFormModal from "./AdminAcademyProgramFormModal";
import AdminAcademyProgramSessionModal from "./AdminAcademyProgramSessionModal";

type Props = {
  programId: string;
};

type Feedback = {
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

function formatCurrency(amount: string | null | undefined, currency: string, locale: string) {
  if (!amount) {
    return "—";
  }

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatDateRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  locale: string,
) {
  const start = formatDateTime(startsAt, locale);
  const end = formatDateTime(endsAt, locale);

  if (start === "—" && end === "—") {
    return "—";
  }

  return `${start} → ${end}`;
}

function getStatusTone(status: string) {
  if (status === "PUBLISHED") return "text-emerald-700 bg-emerald-50";
  if (status === "ARCHIVED") return "text-slate-600 bg-slate-100";
  return "text-amber-700 bg-amber-50";
}

function CopyableField({
  label,
  value,
  fallback,
  locale,
}: {
  label: string;
  value: string | null | undefined;
  fallback: string;
  locale: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-border-light bg-surface-tertiary/70 p-4">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className="min-w-0 break-all text-sm font-semibold text-text-primary">
          {value ?? fallback}
        </p>
        {value ? (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary"
          >
            {copied ? (locale === "ar" ? "تم النسخ" : "Copied") : locale === "ar" ? "نسخ" : "Copy"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminAcademyProgramDetailScreen({ programId }: Props) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthState();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const programQuery = useAdminAcademyProgram(programId);
  const program = programQuery.data;
  const publishProgram = usePublishAdminAcademyProgram();
  const archiveProgram = useArchiveAdminAcademyProgram();
  const updateProgram = useUpdateAdminAcademyProgram();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSessionCreateOpen, setIsSessionCreateOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademyProgramSessionItem | null>(null);

  const sessions = useMemo(() => program?.sessions ?? [], [program?.sessions]);
  const isArchived = program?.status === "ARCHIVED";
  const hasRequiredBasicData = Boolean(
    program &&
      program.titleAr?.trim() &&
      program.titleEn?.trim() &&
      program.descriptionAr?.trim() &&
      program.descriptionEn?.trim() &&
      program.priceEgp?.trim() &&
      program.priceUsd?.trim() &&
      program.startAt &&
      program.endAt,
  );
  const hasValidWindow = Boolean(
    program?.startAt &&
      program?.endAt &&
      new Date(program.endAt).getTime() > new Date(program.startAt).getTime(),
  );
  const canPublish = Boolean(
    program && program.status !== "PUBLISHED" && !isArchived && hasRequiredBasicData && hasValidWindow,
  );
  const publishReadinessNote = !hasRequiredBasicData
    ? t("programs.errors.basicDetailsRequired")
    : !hasValidWindow
      ? t("programs.errors.invalidWindow")
      : null;

  const stats = useMemo(
    () => ({
      sessions: sessions.length,
      publishedSessions: sessions.filter((item) => item.isPublished).length,
      seats: program?.maxSeats ?? 0,
    }),
    [program?.maxSeats, sessions],
  );

  const handlePublish = async () => {
    if (!program) {
      return;
    }

    setFeedback(null);
    try {
      await publishProgram.mutateAsync(program.id);
      setFeedback({ tone: "success", message: t("programs.detail.actions.publishSuccess") });
    } catch (error) {
      setFeedback({ tone: "error", message: t(getAcademyProgramErrorKey(error) as Parameters<typeof t>[0]) });
    }
  };

  const handleArchive = async () => {
    if (!program) {
      return;
    }

    setFeedback(null);
    try {
      await archiveProgram.mutateAsync(program.id);
      setFeedback({ tone: "success", message: t("programs.detail.actions.archiveSuccess") });
      setShowArchiveConfirm(false);
    } catch {
      setFeedback({ tone: "error", message: t("programs.detail.actions.failure") });
    }
  };

  const handleRegistrationToggle = async (registrationOpen: boolean) => {
    if (!program || updateProgram.isPending) {
      return;
    }

    setFeedback(null);
    try {
      await updateProgram.mutateAsync({
        programId: program.id,
        input: { registrationOpen },
      });
      setFeedback({
        tone: "success",
        message: registrationOpen
          ? t("programs.detail.actions.registrationOpenedSuccess")
          : t("programs.detail.actions.registrationClosedSuccess"),
      });
    } catch {
      setFeedback({
        tone: "error",
        message: t("programs.detail.actions.registrationToggleFailure"),
      });
    }
  };

  if (programQuery.isLoading) {
    return <ListStateSkeleton />;
  }

  if (programQuery.isError) {
    return (
      <StateCard
        title={t("programs.states.error.heading")}
        note={t("programs.states.error.note")}
        action={{
          label: t("programs.states.error.retry"),
          onClick: () => programQuery.refetch(),
        }}
        className="rounded-[30px]"
      />
    );
  }

  if (!program) {
    return (
      <StateCard
        title={t("programs.detail.notFound.title")}
        note={t("programs.detail.notFound.note")}
        action={{
          label: t("programs.detail.notFound.back"),
          href: (
            <button
              type="button"
              onClick={() => router.push("/admin/academy/programs" as never)}
              className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-5 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("programs.detail.notFound.back")}
            </button>
          ),
        }}
        className="rounded-[30px]"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            startIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/admin/academy/programs" as never)}
          >
            {t("programs.detail.notFound.back")}
          </Button>
        </div>

        <AdminPageHeader
          eyebrow={t("programs.badge")}
          title={resolveAcademyProgramTitle(program, locale)}
          description={resolveAcademyProgramDescription(program, locale) ?? t("programs.detail.noDescription")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canManage ? (
                <Button
                  variant="outline"
                  startIcon={<Pencil className="h-4 w-4" />}
                  onClick={() => setIsEditOpen(true)}
                >
                  {t("programs.detail.actions.edit")}
                </Button>
              ) : null}
              <Button
                variant="primary"
                startIcon={<BadgeCheck className="h-4 w-4" />}
                onClick={handlePublish}
                disabled={!canPublish || publishProgram.isPending}
              >
                {publishProgram.isPending ? t("programs.detail.actions.publishing") : t("programs.detail.actions.publish")}
              </Button>
              <Button
                variant="danger"
                startIcon={<CircleOff className="h-4 w-4" />}
                onClick={() => setShowArchiveConfirm(true)}
                disabled={isArchived || archiveProgram.isPending}
              >
                {archiveProgram.isPending ? t("programs.detail.actions.archiving") : t("programs.detail.actions.archive")}
              </Button>
            </div>
          }
          meta={
            <div className="flex flex-wrap gap-2">
              <AdminStatusBadge tone={program.status === "PUBLISHED" ? "success" : program.status === "ARCHIVED" ? "neutral" : "warning"}>
                {t(`programs.statuses.${program.status}` as Parameters<typeof t>[0])}
              </AdminStatusBadge>
              <AdminStatusBadge tone={program.registrationOpen ? "success" : "neutral"}>
                {program.registrationOpen ? t("programs.registration.open") : t("programs.registration.closed")}
              </AdminStatusBadge>
              <AdminStatusBadge tone="neutral">
                {resolveAcademyProgramCategoryTitle(program.category, locale) ?? t("programs.detail.noCategory")}
              </AdminStatusBadge>
            </div>
          }
        />

        {publishReadinessNote ? (
          <p className="text-sm font-medium text-text-muted">{publishReadinessNote}</p>
        ) : null}

        {program.status === "PUBLISHED" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{program.registrationOpen ? t("programs.detail.registrationOpenNote") : t("programs.detail.registrationClosedNote")}</p>
              <div className="flex shrink-0 items-center gap-2">
                {program.registrationOpen ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRegistrationToggle(false)}
                    disabled={updateProgram.isPending}
                  >
                    {updateProgram.isPending ? t("programs.detail.actions.updatingRegistration") : t("programs.detail.actions.closeRegistration")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleRegistrationToggle(true)}
                    disabled={updateProgram.isPending}
                  >
                    {updateProgram.isPending ? t("programs.detail.actions.updatingRegistration") : t("programs.detail.actions.openRegistration")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="pt-2">
          <AcademyProgramTabs programId={program.id} value="overview" />
        </div>

        <AdminStatsGrid cols={4}>
          <AdminMetricCard
            label={t("programs.detail.stats.sessions")}
            value={String(stats.sessions)}
            tone="primary"
            icon={<BookOpen className="h-4 w-4" />}
          />
          <AdminMetricCard
            label={t("programs.detail.stats.publishedSessions")}
            value={String(stats.publishedSessions)}
            tone="success"
            icon={<CheckCircle className="h-4 w-4" />}
          />
          <AdminMetricCard
            label={t("programs.detail.stats.seats")}
            value={stats.seats ? String(stats.seats) : "—"}
            tone="info"
            icon={<Users className="h-4 w-4" />}
          />
          <AdminMetricCard
            label={t("programs.detail.stats.registration")}
            value={program.registrationOpen ? t("programs.registration.open") : t("programs.registration.closed")}
            tone={program.registrationOpen ? "success" : "neutral"}
            icon={<Sparkles className="h-4 w-4" />}
          />
        </AdminStatsGrid>
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

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <AdminSectionCard title={t("programs.detail.sections.overview")} description={t("programs.detail.overviewNote")}>
            <div className="rounded-xl border border-border-light bg-surface-tertiary p-5">
              {program.coverImageUrl ? (
                <div className="mb-4 overflow-hidden rounded-xl border border-border-light bg-white">
                  <div className="border-b border-border-light px-4 py-2 text-xs font-semibold text-text-secondary">
                    {t("programs.form.fields.coverImage")}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={program.coverImageUrl}
                    alt={resolveAcademyProgramTitle(program, locale)}
                    className="max-h-72 w-full bg-surface-tertiary object-contain p-2"
                  />
                </div>
              ) : null}
              <p className="text-sm leading-7 text-text-secondary">
                {resolveAcademyProgramDescription(program, locale) ?? t("programs.detail.noDescription")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-text-secondary">
                <AdminStatusBadge tone={program.status === "PUBLISHED" ? "success" : program.status === "ARCHIVED" ? "neutral" : "warning"}>
                  {t(`programs.statuses.${program.status}` as Parameters<typeof t>[0])}
                </AdminStatusBadge>
                <AdminStatusBadge tone={program.registrationOpen ? "success" : "neutral"}>
                  {program.registrationOpen ? t("programs.registration.open") : t("programs.registration.closed")}
                </AdminStatusBadge>
                <span className="rounded-full border border-border-light bg-white px-3 py-1 text-xs font-semibold text-text-secondary">
                  {formatDateRange(program.startAt, program.endAt, locale)}
                </span>
              </div>
            </div>
          </AdminSectionCard>

          <AdminTableSection
            title={t("programs.detail.sections.sessions")}
            subtitle={t("programs.detail.sessionsNote")}
            actions={
              canManage ? (
                <Button
                  size="sm"
                  variant="primary"
                  startIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setIsSessionCreateOpen(true)}
                >
                  {t("programs.detail.sessions.open")}
                </Button>
              ) : undefined
            }
            flushContent
          >
            {sessions.length > 0 ? (
              <DataTable
                data={sessions}
                columns={[
                  {
                    id: "order",
                    header: t("programs.detail.sessions.columns.order"),
                    accessor: (row) => row.sortOrder,
                    cell: (row) => (
                      <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-text-brand">
                        {row.sortOrder}
                      </span>
                    ),
                  },
                  {
                    id: "title",
                    header: t("programs.detail.sessions.columns.title"),
                    accessor: (row) => resolveAcademyProgramSessionTitle(row, locale),
                    cell: (row) => (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {resolveAcademyProgramSessionTitle(row, locale)}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {t(`programs.deliveryMethods.${row.deliveryMethod}` as Parameters<typeof t>[0])}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "startsAt",
                    header: t("programs.detail.sessions.columns.startsAt"),
                    accessor: (row) => new Date(row.startsAt).getTime(),
                    cell: (row) => formatDateTime(row.startsAt, locale),
                  },
                  {
                    id: "endsAt",
                    header: t("programs.detail.sessions.columns.endsAt"),
                    accessor: (row) => new Date(row.endsAt).getTime(),
                    hideOnMobile: true,
                    cell: (row) => formatDateTime(row.endsAt, locale),
                  },
                  {
                    id: "published",
                    header: t("programs.detail.sessions.columns.published"),
                    accessor: (row) => (row.isPublished ? 1 : 0),
                    cell: (row) => (
                      <span className="rounded-full border border-border-light bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary">
                        {row.isPublished
                          ? t("programs.detail.sessions.published")
                          : t("programs.detail.sessions.draft")}
                      </span>
                    ),
                  },
                ]}
                getRowId={(row) => row.id}
                loading={false}
                ariaLabel={t("programs.detail.sessions.heading")}
                caption={t("programs.detail.sessions.heading")}
                rowActions={
                  canManage
                    ? (row) => (
                        <Button size="sm" variant="secondary" onClick={() => setEditingSession(row)}>
                          {t("programs.detail.sessions.edit")}
                        </Button>
                      )
                    : undefined
                }
                rowActionsHeader={canManage ? t("programs.detail.sessions.actions") : undefined}
              />
            ) : (
              <div className="p-6">
                <StateCard
                  title={t("programs.detail.sessions.empty.heading")}
                  note={t("programs.detail.sessions.empty.note")}
                  action={
                    canManage
                      ? {
                          label: t("programs.detail.sessions.open"),
                          onClick: () => setIsSessionCreateOpen(true),
                        }
                      : undefined
                  }
                  className="rounded-[24px]"
                />
              </div>
            )}
          </AdminTableSection>
        </div>

        <div className="space-y-6">
          <AdminSectionCard title={t("programs.detail.sections.summary")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("programs.detail.summary.priceEgp")}</div>
                <div className="font-semibold text-text-primary">
                  {formatCurrency(program.priceEgp, "EGP", locale)}
                </div>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("programs.detail.summary.priceUsd")}</div>
                <div className="font-semibold text-text-primary">
                  {formatCurrency(program.priceUsd, "USD", locale)}
                </div>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("programs.detail.summary.category")}</div>
                <div className="font-semibold text-text-primary">
                  {resolveAcademyProgramCategoryTitle(program.category, locale) ?? t("programs.detail.noCategory")}
                </div>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm">
                <div className="text-xs text-text-muted">{t("programs.detail.summary.updatedAt")}</div>
                <div className="font-semibold text-text-primary">{formatDateTime(program.updatedAt, locale)}</div>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-tertiary px-4 py-3 text-sm col-span-full">
                <div className="text-xs text-text-muted">{t("programs.detail.summary.schedule")}</div>
                <div className="font-semibold text-text-primary">
                  {formatDateRange(program.startAt, program.endAt, locale)}
                </div>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title={t("programs.detail.sections.raw")}>
            <div className="grid gap-3">
              <CopyableField
                label={t("programs.detail.raw.slug")}
                value={program.slug}
                fallback={t("programs.detail.notSet")}
                locale={locale}
              />
              <CopyableField
                label={t("programs.detail.raw.titleAr")}
                value={program.titleAr}
                fallback={t("programs.detail.notSet")}
                locale={locale}
              />
              <CopyableField
                label={t("programs.detail.raw.titleEn")}
                value={program.titleEn}
                fallback={t("programs.detail.notSet")}
                locale={locale}
              />
            </div>
          </AdminSectionCard>
        </div>
      </div>

      {canManage ? (
        <AdminAcademyProgramFormModal
          key={`academy-program-edit-${program.id}-${isEditOpen ? "open" : "closed"}`}
          isOpen={isEditOpen}
          mode="edit"
          program={program}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            programQuery.refetch();
          }}
        />
      ) : null}

      {canManage ? (
        <AdminAcademyProgramSessionModal
          key={`academy-program-session-create-${program.id}-${isSessionCreateOpen ? "open" : "closed"}`}
          isOpen={isSessionCreateOpen}
          mode="create"
          program={program}
          onClose={() => setIsSessionCreateOpen(false)}
          onSuccess={() => {
            programQuery.refetch();
          }}
        />
      ) : null}

      {canManage && editingSession ? (
        <AdminAcademyProgramSessionModal
          key={`academy-program-session-edit-${program.id}-${editingSession.id}`}
          isOpen={Boolean(editingSession)}
          mode="edit"
          program={program}
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSuccess={() => {
            programQuery.refetch();
          }}
        />
      ) : null}

      <DestructiveConfirmModal
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        size="sm"
        title={t("programs.detail.actions.archiveConfirm.title")}
        description={t("programs.detail.actions.archiveConfirm.description")}
        confirmLabel={archiveProgram.isPending ? t("programs.detail.actions.archiving") : t("programs.detail.actions.archive")}
        cancelLabel={t("programs.detail.actions.archiveConfirm.cancel")}
        onConfirm={handleArchive}
        loading={archiveProgram.isPending}
      >
        <div className="rounded-2xl border border-status-warning-border bg-status-warning-soft px-4 py-4 text-sm text-status-warning">
          <p className="font-medium">{resolveAcademyProgramTitle(program, locale)}</p>
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}
