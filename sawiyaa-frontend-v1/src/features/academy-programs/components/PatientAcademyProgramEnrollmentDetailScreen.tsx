"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileBadge2,
  ShieldCheck,
  Sparkles,
  Users,
  ReceiptText,
} from "lucide-react";
import { StateCard } from "@/components/shared/ContentStates";
import { usePatientAcademyProgramEnrollment } from "../hooks/use-academy-programs";
import {
  resolveAcademyProgramDeliveryMethodLabel,
  resolveAcademyProgramCertificateStatusLabel,
  resolveAcademyProgramEnrollmentStatusLabel,
  resolveAcademyProgramLocalizedValue,
  resolveAcademyProgramPaymentStatusLabel,
  resolveAcademyProgramSessionTitle,
} from "../lib/academy-program-localization";
import { resolveAcademyCertificateDownloadUrl } from "../lib/academy-certificate";
import type {
  AcademyProgramAttendanceStatus,
  AcademyProgramEnrollmentItem,
} from "../types/academy-programs.types";

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDurationMinutes(startAt: string, endAt: string, locale: string) {
  const durationMinutes = Math.max(
    0,
    Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000),
  );

  if (locale === "ar") {
    return `${new Intl.NumberFormat("ar-EG").format(durationMinutes || 60)} دقيقة`;
  }

  return `${durationMinutes || 60} mins`;
}

function resolveEnrollmentTone(status: AcademyProgramEnrollmentItem["status"]) {
  switch (status) {
    case "CONFIRMED":
      return "success";
    case "PENDING_PAYMENT":
      return "warning";
    case "CANCELLED":
    case "EXPIRED":
      return "muted";
    default:
      return "default";
  }
}

function normalizeAttendanceStatus(
  status: AcademyProgramAttendanceStatus | null | undefined,
) {
  if (status === "PRESENT" || status === "ABSENT" || status === "UNMARKED") {
    return status;
  }

  return "UNMARKED";
}

function resolveAttendanceTone(status: AcademyProgramAttendanceStatus) {
  switch (normalizeAttendanceStatus(status)) {
    case "PRESENT":
      return "border-success/20 bg-success-light text-success";
    case "ABSENT":
      return "border-warning/20 bg-warning-light text-warning";
    default:
      return "border-border-light bg-surface-tertiary text-text-secondary";
  }
}

function formatMoney(amount: string | null, currency: string | null, locale: string) {
  if (!amount || !currency) {
    return null;
  }

  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }

  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${amount} ${currency}`;
  }
}

function resolveProgramTitle(enrollment: AcademyProgramEnrollmentItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: enrollment.program.titleAr,
      secondary: enrollment.program.titleEn,
      fallback: enrollment.program.title ?? enrollment.program.slug,
    }) || enrollment.program.slug
  );
}

function resolveProgramDescription(enrollment: AcademyProgramEnrollmentItem, locale: string) {
  return (
    resolveAcademyProgramLocalizedValue({
      locale,
      primary: enrollment.program.descriptionAr,
      secondary: enrollment.program.descriptionEn,
      fallback: enrollment.program.description ?? null,
    }) || null
  );
}

function SummaryBadge({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-border-light bg-surface-tertiary px-4 py-3 text-xs">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {icon ? <span className="text-primary">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 font-semibold text-text-primary">{value}</div>
    </div>
  );
}

export default function PatientAcademyProgramEnrollmentDetailScreen({
  enrollmentId,
}: {
  enrollmentId: string;
}) {
  const t = useTranslations("academy");
  const locale = useLocale();
  const { data: enrollmentResponse, isLoading, isError, refetch } =
    usePatientAcademyProgramEnrollment(enrollmentId);

  const enrollment = enrollmentResponse?.item ?? null;
  const attendance = enrollmentResponse?.attendance ?? null;

  const sessions = enrollment?.program.sessions ?? [];
  const title = enrollment ? resolveProgramTitle(enrollment, locale) : "";
  const description = enrollment ? resolveProgramDescription(enrollment, locale) : null;
  const enrollmentStatusLabel = enrollment
    ? resolveAcademyProgramEnrollmentStatusLabel(enrollment.status, t)
    : null;
  const paymentStatusLabel = enrollment
    ? resolveAcademyProgramPaymentStatusLabel(enrollment.paymentStatus, t)
    : null;
  const paymentAmount =
    enrollment
      ? formatMoney(
          enrollment.payment?.amountTotal ?? enrollment.selectedAmountSnapshot,
          enrollment.payment?.currencyCode ?? enrollment.selectedCurrencyCode,
          locale,
        )
      : null;
  const startDate = enrollment ? formatDate(enrollment.program.startAt, locale) : null;
  const endDate = enrollment ? formatDate(enrollment.program.endAt, locale) : null;
  const isPendingPayment = enrollment?.status === "PENDING_PAYMENT" && Boolean(enrollment.payment);
  const payHref = enrollment
    ? `/patient/academy/program-enrollments/${enrollment.id}/pay`
    : "/patient/academy";

  const attendanceSummary = attendance?.summary ?? enrollment?.attendanceSummary ?? null;
  const hasRecordedAttendance = attendance?.hasRecordedAttendance ?? false;
  const attendanceSessionRows = attendance?.sessions ?? [];
  const hasAttendanceSummary =
    hasRecordedAttendance && Boolean(attendanceSummary && attendanceSummary.totalSessions > 0);
  const certificateLabel = enrollment
    ? resolveAcademyProgramCertificateStatusLabel(enrollment.certificate.status, t)
    : null;
  const certificateDownloadUrl =
    enrollment?.certificate.downloadAvailable
      ? resolveAcademyCertificateDownloadUrl({
          enrollmentId: enrollment.id,
          surface: "patient",
        })
      : null;
  const programStateLabel = enrollment
    ? enrollment.status === "CONFIRMED"
      ? t("patient.detail.state.confirmed")
      : enrollment.status === "PENDING_PAYMENT"
        ? t("patient.detail.state.pendingPayment")
        : enrollment.status === "CANCELLED"
          ? t("patient.detail.state.cancelled")
          : enrollment.status === "EXPIRED"
            ? t("patient.detail.state.expired")
            : t("patient.detail.state.default")
    : null;
  const enrollmentTone = (() => {
    if (!enrollment) {
      return "default";
    }

    return resolveEnrollmentTone(enrollment.status);
  })();

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-6 sm:py-8">
        <div className="h-64 animate-pulse rounded-[28px] border border-border-light bg-surface-tertiary" />
        <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <div className="h-96 animate-pulse rounded-[28px] border border-border-light bg-surface-tertiary" />
          <div className="h-96 animate-pulse rounded-[28px] border border-border-light bg-surface-tertiary" />
        </div>
      </div>
    );
  }

  if (isError || !enrollment) {
    return (
      <div className="px-4 py-6 sm:py-8">
        <StateCard
          icon={<AlertCircle className="h-5 w-5 text-primary" />}
          title={t("patient.detail.error.title")}
          note={t("patient.detail.error.note")}
          action={{
            label: t("patient.detail.error.retry"),
            onClick: () => refetch(),
          }}
          className="rounded-[24px]"
        />
      </div>
    );
  }

  return (
    <div className="app-max-content mx-auto space-y-6 px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/patient/academy"
          className="inline-flex items-center justify-center rounded-full border border-border-light bg-white px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="ms-1.5">{t("patient.detail.back")}</span>
        </Link>
        <Link
          href="/patient/messages?lane=support"
          className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-primary-light/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary-light/50"
        >
          {t("patient.detail.support")}
        </Link>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-border-light bg-white p-5 shadow-[0_16px_40px_-32px_rgba(31,42,45,0.18)] sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr] lg:items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light/40 px-3.5 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("patient.detail.badge")}
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-[2.4rem]">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-text-secondary sm:text-base">
                {description ?? t("patient.detail.noDescription")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${
                  enrollmentTone === "success"
                    ? "border-success/20 bg-success-light text-success"
                    : enrollmentTone === "warning"
                      ? "border-warning/20 bg-warning-light text-warning"
                      : "border-border-light/75 bg-white text-text-primary"
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {enrollmentStatusLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light/75 bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm">
                <Clock3 className="h-3.5 w-3.5 text-primary" />
                {paymentStatusLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light/75 bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {programStateLabel}
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-border-light bg-surface-tertiary p-5 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                <ReceiptText className="h-4 w-4 text-primary" />
                {t("patient.detail.summary.title")}
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">
                {t("patient.detail.summary.description")}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <SummaryBadge
                  label={t("patient.detail.summary.startAt")}
                  value={startDate ?? t("public.detail.noDate")}
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                />
                <SummaryBadge
                  label={t("patient.detail.summary.endAt")}
                  value={endDate ?? t("public.detail.noDate")}
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                />
                <SummaryBadge
                  label={t("patient.detail.summary.payment")}
                  value={paymentAmount ?? t("public.detail.free")}
                  icon={<BadgeCheck className="h-3.5 w-3.5" />}
                />
                <SummaryBadge
                  label={t("patient.detail.summary.certificate")}
                  value={certificateLabel ?? t("patient.detail.certificate.notIssued")}
                  icon={<FileBadge2 className="h-3.5 w-3.5" />}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
        <div className="rounded-[28px] border border-border-light bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-text-primary">
            {t("patient.detail.state.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {programStateLabel}
          </p>

          {isPendingPayment ? (
            <div className="mt-5 rounded-[20px] border border-warning/20 bg-warning-light px-4 py-4">
              <p className="text-sm font-medium text-warning">
                {t("patient.detail.pendingPaymentNote")}
              </p>
              <Link
                href={payHref}
                className="mt-4 inline-flex w-full items-center justify-center rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover sm:w-auto"
              >
                {t("patient.detail.actions.retryPayment")}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-border-light bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-text-primary">
            {t("patient.detail.schedule.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {t("patient.detail.schedule.subtitle")}
          </p>

          <div className="mt-5 space-y-3">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-[20px] border border-border-light bg-surface-tertiary p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                        <span className="rounded-full border border-border-light bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider">
                          {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                            session.sortOrder,
                          )}
                        </span>
                        <span className="rounded-full border border-border-light bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider">
                          {resolveAcademyProgramDeliveryMethodLabel(session.deliveryMethod, t)}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-text-primary sm:text-lg">
                        {resolveAcademyProgramSessionTitle(session, locale)}
                      </h3>
                      <p className="text-sm leading-relaxed text-text-secondary">
                        {session.descriptionAr || session.descriptionEn || t("patient.detail.schedule.noDescription")}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:min-w-[220px] sm:max-w-[260px]">
                      <div className="rounded-2xl border border-border-light bg-white px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          {t("public.detail.schedule.columns.date")}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-text-primary">
                          {formatDate(session.startsAt, locale) ?? t("public.detail.noDate")}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border-light bg-white px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          {t("public.detail.schedule.columns.time")}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-text-primary" dir="ltr">
                          {formatTime(session.startsAt, locale)} - {formatTime(session.endsAt, locale)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border-light bg-white px-3 py-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          {t("public.detail.schedule.columns.duration")}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-text-primary">
                          {formatDurationMinutes(session.startsAt, session.endsAt, locale)}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <StateCard
                title={t("patient.detail.schedule.empty.title")}
                note={t("patient.detail.schedule.empty.note")}
                className="rounded-[20px]"
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-border-light bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-text-primary">
            {t("patient.detail.attendance.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {hasRecordedAttendance
              ? t("patient.detail.attendance.recordedNote")
              : t("patient.detail.attendance.note")}
          </p>

          {hasAttendanceSummary && attendanceSummary ? (
            <>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                <SummaryBadge
                  label={t("patient.detail.attendance.total")}
                  value={new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                    attendanceSummary.totalSessions,
                  )}
                  icon={<Users className="h-3.5 w-3.5" />}
                />
                <SummaryBadge
                  label={t("patient.detail.attendance.attended")}
                  value={new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                    attendanceSummary.attendedSessions,
                  )}
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                />
                <SummaryBadge
                  label={t("patient.detail.attendance.absent")}
                  value={new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                    attendanceSummary.absentSessions,
                  )}
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                />
                <SummaryBadge
                  label={t("patient.detail.attendance.unmarked")}
                  value={new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                    attendanceSummary.unmarkedSessions,
                  )}
                  icon={<BadgeCheck className="h-3.5 w-3.5" />}
                />
              </div>

              <div className="mt-5 space-y-3">
                {attendanceSessionRows.length > 0 ? (
                  attendanceSessionRows.map((session) => {
                    const currentStatus = normalizeAttendanceStatus(session.attendanceStatus);
                    const statusLabel =
                      currentStatus === "PRESENT"
                        ? t("programs.attendance.statuses.present")
                        : currentStatus === "ABSENT"
                          ? t("programs.attendance.statuses.absent")
                          : t("programs.attendance.statuses.unmarked");

                    return (
                      <article
                        key={session.id}
                        className="rounded-[20px] border border-border-light bg-surface-tertiary p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
                              <span className="rounded-full border border-border-light bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider">
                                {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
                                  session.sortOrder,
                                )}
                              </span>
                              <span className="rounded-full border border-border-light bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider">
                                {resolveAcademyProgramDeliveryMethodLabel(
                                  session.deliveryMethod,
                                  t,
                                )}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-text-primary sm:text-lg">
                              {resolveAcademyProgramSessionTitle(session, locale)}
                            </h3>
                            <p className="text-sm leading-relaxed text-text-secondary">
                              {formatDate(session.startsAt, locale) ?? t("public.detail.noDate")}
                              <span className="px-1.5 text-text-muted">-</span>
                              <span dir="ltr">
                                {formatTime(session.startsAt, locale)} - {formatTime(session.endsAt, locale)}
                              </span>
                            </p>
                            {session.markedAt ? (
                              <p className="text-xs text-text-muted">
                                {t("programs.attendance.row.markedAt", {
                                  date: formatDate(session.markedAt, locale) ?? t("public.detail.noDate"),
                                })}
                              </p>
                            ) : null}
                          </div>

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${resolveAttendanceTone(
                              currentStatus,
                            )}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-dashed border-border-light bg-surface-tertiary px-4 py-4 text-sm text-text-muted">
                    {hasRecordedAttendance
                      ? t("patient.detail.attendance.sessionRecordsUnavailable")
                      : t("patient.detail.attendance.empty")}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[20px] border border-dashed border-border-light px-4 py-4 text-sm text-text-muted">
              {t("patient.detail.attendance.empty")}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-border-light bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-text-primary">
            {t("patient.detail.certificate.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {t("patient.detail.certificate.note")}
          </p>
          <div className="mt-5 rounded-[20px] border border-border-light bg-surface-tertiary px-4 py-4">
            <div className="flex items-start gap-3">
              {enrollment.certificate.status === "ISSUED" || enrollment.certificate.status === "REISSUED" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              ) : (
                <ShieldCheck className="mt-0.5 h-5 w-5 text-text-muted" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-text-primary">
                  {certificateLabel}
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {enrollment.certificate.issuedAt
                    ? formatDate(enrollment.certificate.issuedAt, locale)
                    : t("patient.detail.certificate.notAvailable")}
                </p>
                {enrollment.certificate.uploadedAt ? (
                  <p className="mt-1 text-xs text-text-muted">
                    {t("patient.detail.certificate.uploadedAt")}:{" "}
                    {formatDate(enrollment.certificate.uploadedAt, locale)}
                  </p>
                ) : null}
                {enrollment.certificate.fileName ? (
                  <p className="mt-1 truncate text-xs text-text-muted">
                    {t("patient.detail.certificate.fileName")}: {enrollment.certificate.fileName}
                  </p>
                ) : null}
              </div>
            </div>

            {certificateDownloadUrl ? (
              <a
                href={certificateDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover sm:w-auto"
              >
                {t("patient.detail.certificate.download")}
              </a>
            ) : (
              <p className="mt-4 text-xs leading-relaxed text-text-muted">
                {t("patient.detail.certificate.downloadUnavailable")}
              </p>
            )}
          </div>

          {isPendingPayment && enrollment.payment ? (
            <Link
              href={payHref}
              className="mt-5 inline-flex w-full items-center justify-center rounded-[14px] bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover sm:w-auto"
            >
              {t("patient.detail.actions.retryPayment")}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
