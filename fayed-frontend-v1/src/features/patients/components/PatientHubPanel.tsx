"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Calendar, Clock, CreditCard, Search, UserRound } from "lucide-react";
import { usePatientSessions } from "@/features/sessions/hooks/use-sessions";
import { usePatientPayments } from "@/features/payments/hooks/use-payments";
import { Skeleton } from "@/components/shared/LoadingStates";
import type { SessionStatus } from "@/features/sessions/types/sessions.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDatetime(isoString: string | null, numLocale: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(numLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

const SESSION_STATUS_CLASS: Partial<Record<SessionStatus, string>> = {
  PENDING_PAYMENT:
    "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",
  PENDING_PRACTITIONER_RESPONSE:
    "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",
  CONFIRMED:
    "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20",
  UPCOMING:
    "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20",
  READY_TO_JOIN: "text-primary bg-primary/10 dark:text-primary-light dark:bg-primary/15",
  IN_PROGRESS: "text-primary bg-primary/10 dark:text-primary-light dark:bg-primary/15",
  COMPLETED: "text-text-muted bg-surface-tertiary dark:bg-white/10 dark:text-white/50",
  CANCELLED: "text-text-muted bg-surface-tertiary dark:bg-white/10 dark:text-white/50",
  EXPIRED: "text-text-muted bg-surface-tertiary dark:bg-white/10 dark:text-white/50",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PatientHubPanel() {
  const t = useTranslations("patient-area");
  const tStatus = useTranslations("sessions");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const { data: sessionsData, isLoading: sessionsLoading } = usePatientSessions({ limit: 5 });
  const { data: paymentsData } = usePatientPayments({ limit: 3 });

  const sessions = sessionsData?.items ?? [];
  const payments = paymentsData?.items ?? [];

  // Priority detection
  const pendingPaymentSession = sessions.find(
    (s) => s.status === "PENDING_PAYMENT",
  );
  const upcomingSession = sessions.find(
    (s) =>
      s.status === "CONFIRMED" ||
      s.status === "UPCOMING" ||
      s.status === "READY_TO_JOIN" ||
      s.status === "IN_PROGRESS",
  );
  const hasFailedPayment = payments.some((p) => p.status === "FAILED");

  const hasAnySessions = sessions.length > 0;
  const firstName = null;

  const displayedSessions = sessions.slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Greeting */}
      <div className="px-1">
        <p className="text-xl font-semibold text-text-primary dark:text-white/95">
          {firstName
            ? t("hub.greetingNamed", { name: firstName })
            : t("hub.greeting")}
        </p>
      </div>

      {/* Priority action banner */}
      {sessionsLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : pendingPaymentSession ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-700/30 dark:bg-amber-900/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            {t("hub.priority.pendingPayment.label")}
          </p>
          <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-400/80">
            {t("hub.priority.pendingPayment.note")}
          </p>
          <Link
            href={`/patient/sessions/${pendingPaymentSession.id}/pay` as never}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            {t("hub.priority.pendingPayment.cta")}
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>
      ) : upcomingSession ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary dark:text-primary-light">
            {t("hub.priority.upcoming.label")}
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
            {t("hub.priority.upcoming.with", {
              practitioner:
                upcomingSession.practitioner.displayName ??
                upcomingSession.practitioner.slug,
            })}
          </p>
          {upcomingSession.scheduledStartAt && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
              <Clock size={11} />
              {formatDatetime(upcomingSession.scheduledStartAt, numLocale)}
            </p>
          )}
          <Link
            href={`/patient/sessions/${upcomingSession.id}` as never}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-primary-light"
          >
            {t("hub.priority.upcoming.cta")}
            <ArrowRight size={13} className="rtl:rotate-180" />
          </Link>
        </div>
      ) : hasFailedPayment ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-700/30 dark:bg-red-900/10">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
            {t("hub.priority.failedPayment.label")}
          </p>
          <p className="mt-1 text-sm text-red-700/80 dark:text-red-400/80">
            {t("hub.priority.failedPayment.note")}
          </p>
          <Link
            href="/patient/payments"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline dark:text-red-400"
          >
            {t("hub.priority.failedPayment.cta")}
            <ArrowRight size={13} className="rtl:rotate-180" />
          </Link>
        </div>
      ) : null}

      {/* Sessions list or empty state */}
      {sessionsLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[72px] rounded-2xl" />
          <Skeleton className="h-[72px] rounded-2xl" />
        </div>
      ) : hasAnySessions ? (
        <div className="overflow-hidden rounded-2xl border border-border-light bg-white dark:bg-white/5">
          <div className="flex items-center justify-between border-b border-border-light px-5 py-3.5 dark:border-white/10">
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("hub.sessions.heading")}
            </p>
            <Link
              href="/patient/sessions"
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("hub.sessions.viewAll")}
            </Link>
          </div>
          <div className="divide-y divide-border-light dark:divide-white/10">
            {displayedSessions.map((session) => (
              <Link
                key={session.id}
                href={`/patient/sessions/${session.id}` as never}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-surface-tertiary/50 dark:hover:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary dark:text-white/90">
                    {session.practitioner.displayName ?? session.practitioner.slug}
                  </p>
                  {session.scheduledStartAt && (
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatDatetime(session.scheduledStartAt, numLocale)}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SESSION_STATUS_CLASS[session.status] ?? "bg-surface-tertiary text-text-muted"}`}
                >
                  {tStatus(
                    `status.${session.status}` as Parameters<typeof tStatus>[0],
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border-light bg-white p-8 text-center dark:bg-white/5">
          <p className="mb-1 text-base font-semibold text-text-primary dark:text-white/90">
            {t("hub.empty.heading")}
          </p>
          <p className="mb-5 text-sm text-text-secondary">{t("hub.empty.note")}</p>
          <Link
            href="/practitioners"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            {t("hub.empty.cta")}
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            {
              href: "/patient/sessions",
              Icon: Calendar,
              labelKey: "hub.links.sessions",
            },
            {
              href: "/patient/payments",
              Icon: CreditCard,
              labelKey: "hub.links.payments",
            },
            {
              href: "/practitioners",
              Icon: Search,
              labelKey: "hub.links.practitioners",
            },
            {
              href: "/patient/profile",
              Icon: UserRound,
              labelKey: "hub.links.profile",
            },
          ] as const
        ).map(({ href, Icon, labelKey }) => (
          <Link
            key={href}
            href={href as never}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border-light bg-white p-4 text-center transition hover:border-primary/30 hover:bg-primary/5 dark:bg-white/5 dark:hover:bg-primary/10 dark:hover:border-primary/30"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-light">
              <Icon size={18} />
            </span>
            <span className="text-xs font-medium text-text-secondary dark:text-white/70">
              {t(labelKey as Parameters<typeof t>[0])}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
