"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  PatientPageHeader,
  PatientSectionCard,
  PatientStatusBadge,
} from "@/components/patient/PatientChrome";
import PractitionerAvatar from "@/components/shared/PractitionerAvatar";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import { MoneyText } from "@/components/money/MoneyText";
import { toAppError } from "@/lib/api/errors";
import {
  useCancelPatientInstantBookingRequest,
  useCreatePatientInstantBookingRequest,
  usePatientInstantBookingPractitioners,
  usePatientInstantBookingRequest,
  usePatientInstantBookingRequests,
} from "../hooks/use-instant-booking";
import type {
  InstantBookingDiscoveryCurrency,
  InstantBookingDiscoveryDuration,
  InstantBookingEligiblePractitionerItem,
  InstantBookingRequest,
  SessionMode,
} from "../types/instant-booking.types";
import { mapInstantBookingDiscoveryMoney } from "../lib/instant-booking-money";

function formatDateTime(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";

  return new Date(isoString).toLocaleString(numLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

function formatTime(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";

  return new Date(isoString).toLocaleTimeString(numLocale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

function getPractitionerInitials(displayName: string | null | undefined): string {
  const clean = displayName?.trim() ?? "";
  if (!clean) return "DR";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function requestStatusTone(status: InstantBookingRequest["status"]) {
  switch (status) {
    case "PENDING":
      return "warning" as const;
    case "ACCEPTED":
      return "success" as const;
    case "REJECTED":
    case "EXPIRED":
    case "CANCELLED":
    default:
      return "neutral" as const;
  }
}

function RequestStateCard({
  request,
  locale,
  numLocale,
  onReset,
  onPay,
  onCancel,
  cancelPending,
}: {
  request: InstantBookingRequest;
  locale: string;
  numLocale: string;
  onReset: () => void;
  onPay: () => void;
  onCancel: () => void;
  cancelPending: boolean;
}) {
  const t = useTranslations("instant-booking");
  const statusLabel = t(`statuses.${request.status}` as Parameters<typeof t>[0]);
  const practitionerLabel =
    request.practitioner.displayName?.trim() || request.practitioner.slug;
  const durationLabel = t("request.duration", {
    minutes: request.requestedDurationMinutes,
  });
  const modeLabel = t(`request.sessionModes.${request.sessionMode}` as Parameters<typeof t>[0]);
  const expiresLabel = formatDateTime(request.expiresAt, numLocale);
  const tone = requestStatusTone(request.status);

  const stateStyles =
    request.status === "PENDING"
      ? "border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10"
      : request.status === "ACCEPTED"
        ? "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
        : "border-border-light bg-surface-primary dark:bg-white/5";

  const toneBadgeStyles =
    tone === "warning"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
      : tone === "success"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
        : "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/80";

  const noteKey =
    request.status === "PENDING"
      ? "request.pendingNote"
      : request.status === "ACCEPTED"
        ? "request.acceptedNote"
        : request.status === "REJECTED"
          ? "request.rejectedNote"
          : request.status === "EXPIRED"
            ? "request.expiredNote"
            : "request.cancelledNote";

  return (
    <PatientSectionCard
      eyebrow={t("request.eyebrow")}
      title={t(`request.titles.${request.status}` as Parameters<typeof t>[0])}
      description={t(`request.notes.${request.status}` as Parameters<typeof t>[0])}
      actions={
        <PatientStatusBadge className={toneBadgeStyles}>{statusLabel}</PatientStatusBadge>
      }
    >
      <div className={`rounded-[28px] border p-5 shadow-sm ${stateStyles}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("request.currentRequest")}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
              {practitionerLabel}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {t("request.detailsLine", {
                duration: durationLabel,
                mode: modeLabel,
              })}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm ring-1 ring-border-light dark:bg-white/10 dark:text-white/90 dark:ring-white/10">
            {request.status === "PENDING" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
            ) : request.status === "ACCEPTED" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-text-muted" />
            )}
            <span>{statusLabel}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-border-light dark:bg-white/5 dark:ring-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("request.fields.practitioner")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {practitionerLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-border-light dark:bg-white/5 dark:ring-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("request.fields.duration")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {durationLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-border-light dark:bg-white/5 dark:ring-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("request.fields.sessionMode")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {modeLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-border-light dark:bg-white/5 dark:ring-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("request.fields.expiresAt")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {expiresLabel}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-white/60 bg-white/60 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-2">
            {request.status === "PENDING" ? (
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : request.status === "ACCEPTED" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            )}
            <div className="space-y-1">
              <p>{t(noteKey as Parameters<typeof t>[0])}</p>
              {request.responseReason ? (
                <p className="text-xs text-text-muted">{request.responseReason}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {request.status === "PENDING" ? (
            <Button
              variant="danger"
              size="sm"
              onClick={onCancel}
              disabled={cancelPending}
              startIcon={
                cancelPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />
              }
            >
              {t("request.cancelAction")}
            </Button>
          ) : null}

          {request.status === "ACCEPTED" && request.createdSessionId ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onPay}
              startIcon={<ShieldCheck className="h-4 w-4" />}
            >
              {t("request.payAction")}
            </Button>
          ) : null}

          {request.status !== "PENDING" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              startIcon={<RefreshCw className="h-4 w-4" />}
            >
              {t("request.resetAction")}
            </Button>
          ) : null}
        </div>
      </div>
    </PatientSectionCard>
  );
}

function PractitionerCard({
  practitioner,
  currency,
  locale,
  numLocale,
  onBook,
  pendingBookKey,
  createPending,
}: {
  practitioner: InstantBookingEligiblePractitionerItem;
  currency: InstantBookingDiscoveryCurrency;
  locale: string;
  numLocale: string;
  onBook: (slug: string, duration: InstantBookingDiscoveryDuration) => void;
  pendingBookKey: string | null;
  createPending: boolean;
}) {
  const t = useTranslations("instant-booking");
  const isArabic = locale === "ar";
  const displayName = practitioner.displayName?.trim() || practitioner.slug;
  const title = practitioner.title?.trim() || "";
  const specialty = practitioner.primarySpecialty?.trim() || "";
  const shortBio = practitioner.shortBio?.trim() || "";
  const endLabel = formatTime(practitioner.currentWindowEndsAt, numLocale);
  const initials = getPractitionerInitials(displayName);
  const rating =
    typeof practitioner.rating === "number" && Number.isFinite(practitioner.rating)
      ? practitioner.rating.toFixed(1)
      : null;
  const completedSessions =
    typeof practitioner.completedSessionsCount === "number"
      ? new Intl.NumberFormat(numLocale).format(practitioner.completedSessionsCount)
      : null;
  const cardBusy = createPending && pendingBookKey?.startsWith(practitioner.slug);

  return (
    <article className="rounded-[28px] border border-border-light bg-white p-4 shadow-[0_18px_32px_-26px_rgba(34,52,56,0.14)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_36px_-26px_rgba(68,161,148,0.2)] dark:bg-surface-secondary">
      <div className={`flex items-start gap-3 ${isArabic ? "flex-row" : "flex-row-reverse"}`}>
        <PractitionerAvatar
          src={practitioner.avatarUrl}
          alt={displayName}
          initials={initials}
          className="h-14 w-14 shrink-0 rounded-full ring-1 ring-border-light"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                {displayName}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {[title, specialty].filter(Boolean).join(" · ")}
              </p>
            </div>

            <PatientStatusBadge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
              {t("card.availableNow")}
            </PatientStatusBadge>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-text-brand">
              {t("card.until", { value: endLabel })}
            </span>
            {rating ? (
              <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary dark:bg-white/10 dark:text-white/75">
                {t("card.rating", { value: rating })}
              </span>
            ) : null}
            {completedSessions ? (
              <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary dark:bg-white/10 dark:text-white/75">
                {t("card.completedSessions", { count: completedSessions })}
              </span>
            ) : null}
          </div>

          {shortBio ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">
              {shortBio}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-[24px] bg-surface-secondary/70 p-3 dark:bg-white/5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span>{t("card.selectDuration")}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {practitioner.supportedDurations.map((duration) => {
            const money = mapInstantBookingDiscoveryMoney({
              practitioner,
              currencyCode: currency,
              durationMinutes: duration,
            });
            if (!money) return null;

            const isPending = cardBusy && pendingBookKey === `${practitioner.slug}:${duration}`;

            return (
              <Button
                key={duration}
                variant="outline"
                size="sm"
                className="w-full items-center justify-between rounded-2xl bg-white/90 text-text-primary dark:bg-white/10"
                onClick={() => onBook(practitioner.slug, duration)}
                disabled={createPending}
                startIcon={
                  isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />
                }
              >
                <span>{t("card.durationLabel", { minutes: duration })}</span>
                <span className="font-semibold"><MoneyText money={money} /></span>
              </Button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default function PatientInstantBookingScreen() {
  const t = useTranslations("instant-booking");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const requestIdFromUrl = searchParams.get("requestId")?.trim() || null;

  const patientProfileQuery = usePatientProfile();
  const practitionersQuery = usePatientInstantBookingPractitioners({
    page: 1,
    limit: 30,
  });
  const resolvedCurrency = practitionersQuery.data?.currencyCode ?? null;
  const requestsQuery = usePatientInstantBookingRequests();
  const latestPendingRequest = useMemo(
    () => requestsQuery.data?.find((request) => request.status === "PENDING") ?? null,
    [requestsQuery.data],
  );

  const activeRequestId = requestIdFromUrl ?? latestPendingRequest?.id ?? null;
  const activeRequestQuery = usePatientInstantBookingRequest(activeRequestId);
  const activeRequest =
    activeRequestQuery.data ??
    (latestPendingRequest && latestPendingRequest.id === activeRequestId
      ? latestPendingRequest
      : null);

  const createMutation = useCreatePatientInstantBookingRequest();
  const cancelMutation = useCancelPatientInstantBookingRequest();
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageError(null);
  }, [locale, activeRequestId, resolvedCurrency]);

  const navigateWithRequestId = (requestId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (requestId) {
      params.set("requestId", requestId);
    } else {
      params.delete("requestId");
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl as never);
  };

  const handleBook = async (
    practitionerSlug: string,
    durationMinutes: InstantBookingDiscoveryDuration,
  ) => {
    setPageError(null);

    try {
      const request = await createMutation.mutateAsync({
        practitionerSlug,
        durationMinutes,
        sessionMode: "VIDEO" satisfies SessionMode,
      });
      navigateWithRequestId(request.id);
    } catch (error) {
      const appError = toAppError(error);

      if (
        appError.code === "INSTANT_BOOKING_PENDING_REQUEST_ALREADY_EXISTS" &&
        latestPendingRequest
      ) {
        navigateWithRequestId(latestPendingRequest.id);
        return;
      }

      setPageError(t("errors.createFailed"));
    }
  };

  const handleCancel = async () => {
    if (!activeRequest) return;

    setPageError(null);
    try {
      await cancelMutation.mutateAsync({ requestId: activeRequest.id });
      navigateWithRequestId(null);
    } catch (error) {
      toAppError(error);
      setPageError(t("errors.cancelFailed"));
    }
  };

  const showBrowseState = !activeRequest;
  const isBrowseLoading = practitionersQuery.isLoading || patientProfileQuery.isLoading;
  const archivedRequest =
    activeRequest &&
    activeRequest.status !== "PENDING" &&
    activeRequest.status !== "ACCEPTED"
      ? activeRequest
      : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PatientPageHeader
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.note")}
        meta={
          <div className="flex flex-wrap gap-2">
            <PatientStatusBadge className="bg-primary-light text-text-brand">
              {t("hero.chips.onlineNow")}
            </PatientStatusBadge>
            <PatientStatusBadge className="bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/80">
              {t("hero.chips.durationOptions")}
            </PatientStatusBadge>
            <PatientStatusBadge className="bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/80">
              {t("hero.chips.backendPricing")}
            </PatientStatusBadge>
          </div>
        }
        actions={
          <Link
            href="/patient/practitioners"
            className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/25 hover:bg-primary-light/50 hover:text-primary dark:bg-surface-secondary dark:text-white/90"
          >
            <UserRound className="h-4 w-4" />
            {t("hero.secondaryAction")}
          </Link>
        }
      />

      {pageError ? (
        <StateCard
          icon={<AlertCircle className="h-5 w-5 text-error-500" />}
          title={t("errors.genericHeading")}
          note={pageError}
          action={{
            label: t("errors.retry"),
            onClick: () => {
              setPageError(null);
              void practitionersQuery.refetch();
              void requestsQuery.refetch();
            },
          }}
        />
      ) : null}

      <PatientSectionCard
        eyebrow={t("entry.eyebrow")}
        title={t("entry.title")}
        description={t("entry.note")}
        actions={
          <Link
            href="/patient/instant-booking"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            {t("entry.cta")}
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        }
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-primary/8 px-4 py-3 ring-1 ring-primary/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {t("hero.chips.onlineNow")}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{t("entry.chips.availableNow")}</p>
          </div>
          <div className="rounded-2xl bg-surface-tertiary px-4 py-3 ring-1 ring-border-light dark:bg-white/5 dark:ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("entry.chips.duration")}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{t("entry.chips.durationNote")}</p>
          </div>
          <div className="rounded-2xl bg-surface-tertiary px-4 py-3 ring-1 ring-border-light dark:bg-white/5 dark:ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("entry.chips.pricing")}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{t("entry.chips.pricingNote")}</p>
          </div>
        </div>
      </PatientSectionCard>

      {activeRequest ? (
        <RequestStateCard
          request={activeRequest}
          locale={locale}
          numLocale={numLocale}
          onReset={() => navigateWithRequestId(null)}
          onPay={() => {
            if (!activeRequest.createdSessionId) return;
            router.push(`/patient/sessions/${activeRequest.createdSessionId}/pay` as never);
          }}
          onCancel={handleCancel}
          cancelPending={cancelMutation.isPending}
        />
      ) : null}

      {showBrowseState ? (
        <PatientSectionCard
          eyebrow={t("list.eyebrow")}
          title={t("list.title")}
          description={t("list.note")}
          actions={
            <PatientStatusBadge className="bg-primary-light text-text-brand">
              {resolvedCurrency ?? "—"}
            </PatientStatusBadge>
          }
        >
          {isBrowseLoading ? (
            <ListStateSkeleton items={4} heightClass="h-[240px]" />
          ) : practitionersQuery.isError ? (
            <StateCard
              icon={<AlertCircle className="h-5 w-5 text-primary" />}
              title={t("errors.loadingHeading")}
              note={t("errors.loadingNote")}
              action={{
                label: t("errors.retry"),
                onClick: () => {
                  void practitionersQuery.refetch();
                  void requestsQuery.refetch();
                },
              }}
            />
          ) : practitionersQuery.data?.items.length && resolvedCurrency ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {practitionersQuery.data.items.map((practitioner) => (
                <PractitionerCard
                  key={practitioner.practitionerId}
                  practitioner={practitioner}
                  currency={resolvedCurrency}
                  locale={locale}
                  numLocale={numLocale}
                  onBook={handleBook}
                  pendingBookKey={
                    createMutation.isPending && createMutation.variables
                      ? `${createMutation.variables.practitionerSlug}:${createMutation.variables.durationMinutes}`
                      : null
                  }
                  createPending={createMutation.isPending}
                />
              ))}
            </div>
          ) : practitionersQuery.data?.items.length ? (
            <StateCard
              icon={<AlertCircle className="h-5 w-5 text-primary" />}
              title={t("errors.loadingHeading")}
              note={t("errors.loadingNote")}
            />
          ) : (
            <StateCard
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              title={t("empty.heading")}
              note={t("empty.note")}
              action={{
                label: t("empty.action"),
                href: (
                  <Link
                    href="/patient/practitioners"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    {t("empty.action")}
                  </Link>
                ),
              }}
            />
          )}
        </PatientSectionCard>
      ) : null}

      {archivedRequest ? (
        <PatientSectionCard
          eyebrow={t("followUp.eyebrow")}
          title={t("followUp.archiveTitle")}
          description={t("followUp.archiveNote")}
        >
          <div className="rounded-[24px] border border-border-light bg-surface-secondary p-4 text-sm leading-6 text-text-secondary dark:bg-white/5">
            <div className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>{t(`statuses.${archivedRequest.status}` as Parameters<typeof t>[0])}</p>
            </div>
          </div>
        </PatientSectionCard>
      ) : null}
    </div>
  );
}
