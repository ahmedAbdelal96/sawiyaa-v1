"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { usePractitionerProfile } from "../hooks/use-practitioners";
import {
  useAcceptInstantBookingRequest,
  usePractitionerPendingBookingRequests,
  useRejectInstantBookingRequest,
} from "@/features/instant-booking/hooks/use-instant-booking";
import { usePractitionerSessions } from "@/features/sessions/hooks/use-sessions";
import PresencePanel from "@/features/presence/components/PresencePanel";
import { useMyPresence } from "@/features/presence/hooks/use-presence";
import SessionStatusBadge from "@/features/sessions/components/SessionStatusBadge";
import { Skeleton } from "@/components/shared/LoadingStates";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import type { InstantBookingRequest } from "@/features/instant-booking/types/instant-booking.types";
import type { SessionListItem, SessionStatus } from "@/features/sessions/types/sessions.types";
import type { PractitionerApplicationStatus } from "../types/practitioners.types";
import type { PresenceStatus } from "@/features/presence/types/presence.types";

const ACTIVE_STATUSES: SessionStatus[] = [
  "PENDING_PRACTITIONER_RESPONSE",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
];

type AttentionCard = {
  heading: string;
  note: string;
  href: string;
  cta: string;
  Icon: typeof Zap;
  toneClass: string;
};

type WorkspaceSecondaryLink = {
  href: string;
  Icon: typeof Calendar;
  labelKey:
    | "dashboard.workspace.links.profile"
    | "dashboard.workspace.links.application"
    | "dashboard.workspace.links.credentials"
    | "dashboard.workspace.links.specialties";
  noteKey:
    | "dashboard.workspace.links.profileNote"
    | "dashboard.workspace.links.applicationNote"
    | "dashboard.workspace.links.credentialsNote"
    | "dashboard.workspace.links.specialtiesNote";
  badgeKey?: "dashboard.workspace.links.limitedBadge";
};

type WorkspaceFinanceLink = {
  href: string;
  Icon: typeof Calendar;
  labelKey:
    | "dashboard.workspace.links.wallet"
    | "dashboard.workspace.links.ledger"
    | "dashboard.workspace.links.settlements";
  noteKey:
    | "dashboard.workspace.links.walletNote"
    | "dashboard.workspace.links.ledgerNote"
    | "dashboard.workspace.links.settlementsNote";
};

function formatScheduledAt(isoString: string | null, numLocale: string): string {
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

function formatExpiry(isoString: string, numLocale: string): string {
  return new Date(isoString).toLocaleString(numLocale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !numLocale.startsWith("ar"),
  });
}

function getSessionNoteKey(status: SessionStatus) {
  switch (status) {
    case "READY_TO_JOIN":
      return "dashboard.workspace.sessions.notes.READY_TO_JOIN";
    case "IN_PROGRESS":
      return "dashboard.workspace.sessions.notes.IN_PROGRESS";
    case "PENDING_PAYMENT":
      return "dashboard.workspace.sessions.notes.PENDING_PAYMENT";
    case "PENDING_PRACTITIONER_RESPONSE":
      return "dashboard.workspace.sessions.notes.PENDING_PRACTITIONER_RESPONSE";
    case "UPCOMING":
      return "dashboard.workspace.sessions.notes.UPCOMING";
    case "CONFIRMED":
    default:
      return "dashboard.workspace.sessions.notes.CONFIRMED";
  }
}

function getPresenceSummaryKey(
  status: PresenceStatus | null,
  isInstantBookingEnabled: boolean | null,
) {
  if (status === "ONLINE" && isInstantBookingEnabled) {
    return "dashboard.runtime.readiness.onlineInstant";
  }
  if (status === "ONLINE") {
    return "dashboard.runtime.readiness.online";
  }
  if (status === "AWAY") {
    return "dashboard.runtime.readiness.away";
  }
  if (status === "BUSY") {
    return "dashboard.runtime.readiness.busy";
  }
  return "dashboard.runtime.readiness.offline";
}

function WorkspaceRequestCard({ request }: { request: InstantBookingRequest }) {
  const t = useTranslations("sessions.practitioner.instantBooking");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const acceptMutation = useAcceptInstantBookingRequest();
  const rejectMutation = useRejectInstantBookingRequest();
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [acceptedSessionId, setAcceptedSessionId] = useState<string | null>(null);

  const handleAccept = async () => {
    try {
      const result = await acceptMutation.mutateAsync(request.id);
      setAcceptedSessionId(result.createdSessionId);
    } catch {
      // Mutation error is shown inline.
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ requestId: request.id });
      setConfirmingReject(false);
    } catch {
      // Mutation error is shown inline.
    }
  };

  if (acceptedSessionId) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800/40 dark:bg-green-900/10">
        <p className="mb-2 text-sm text-green-700 dark:text-green-400">
          {t("acceptedNote")}
        </p>
        <Link
          href={`/practitioner/sessions/${acceptedSessionId}` as never}
          className="inline-flex items-center rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
        >
          {t("viewSession")}
        </Link>
      </div>
    );
  }

  const isBusy = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <div className="rounded-xl border border-border-light bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3">
        <p className="text-sm font-semibold text-text-primary dark:text-white/90">
          {t("requestFrom")} {request.patient?.displayName ?? "-"}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
          <span>{t("duration", { n: request.requestedDurationMinutes })}</span>
          <span aria-hidden>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {t("expiresAt")} {formatExpiry(request.expiresAt, numLocale)}
          </span>
        </div>
      </div>

      {acceptMutation.isError && (
        <p className="mb-2 text-xs text-red-500">{t("acceptError")}</p>
      )}
      {rejectMutation.isError && (
        <p className="mb-2 text-xs text-red-500">{t("rejectError")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
        >
          {acceptMutation.isPending ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              {t("accepting")}
            </>
          ) : (
            t("accept")
          )}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingReject(true)}
          disabled={isBusy}
          className="inline-flex items-center rounded-xl border border-border-light px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5 disabled:opacity-60"
        >
          {t("reject")}
        </button>
      </div>

      <DestructiveConfirmModal
        isOpen={confirmingReject}
        onClose={() => {
          setConfirmingReject(false);
          rejectMutation.reset();
        }}
        size="sm"
        title={t("rejectConfirm.heading")}
        description={t("rejectConfirm.note")}
        confirmLabel={
          rejectMutation.isPending ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              {t("rejecting")}
            </>
          ) : (
            t("rejectConfirm.confirm")
          )
        }
        cancelLabel={t("rejectConfirm.back")}
        onConfirm={handleReject}
        loading={isBusy}
      >
        <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <p className="font-medium">{request.patient?.displayName ?? "-"}</p>
          <p className="mt-1 text-xs opacity-80">
            {t("duration", { n: request.requestedDurationMinutes })}
          </p>
        </div>
      </DestructiveConfirmModal>
    </div>
  );
}

function WorkspaceSessionRow({ session }: { session: SessionListItem }) {
  const t = useTranslations("sessions");
  const areaT = useTranslations("practitioner-area");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <Link
      href={`/practitioner/sessions/${session.id}` as never}
      className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-surface-tertiary/40 dark:hover:bg-white/5"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary dark:text-white/90">
          {t("card.with")} {session.patient?.displayName ?? "-"}
        </p>
        {session.scheduledStartAt ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
            <CalendarDays size={11} />
            {formatScheduledAt(session.scheduledStartAt, numLocale)}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-text-muted">{t("card.noSchedule")}</p>
        )}
        <p className="mt-1 text-xs text-text-secondary">
          {areaT(getSessionNoteKey(session.status))}
        </p>
      </div>
      <SessionStatusBadge status={session.status} />
    </Link>
  );
}

export default function PractitionerDashboard() {
  const t = useTranslations("practitioner-area");

  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = usePractitionerProfile();

  const {
    data: requests,
    isLoading: requestsLoading,
    isError: requestsError,
  } = usePractitionerPendingBookingRequests();

  const { data: presenceData } = useMyPresence();

  const { data: sessionsData, isLoading: sessionsLoading } = usePractitionerSessions({
    limit: 10,
  });

  const profile = profileData?.profile;
  const greeting = profile?.displayName
    ? t("dashboard.greeting.withName", { name: profile.displayName })
    : t("dashboard.greeting.generic");

  const appStatus = profile?.applicationStatusSummary?.status as
    | PractitionerApplicationStatus
    | undefined;

  const pendingRequests = requests ?? [];

  const upcomingSessions = (sessionsData?.items ?? [])
    .filter((session) => ACTIVE_STATUSES.includes(session.status))
    .slice(0, 4);

  const readySessions = useMemo(
    () =>
      upcomingSessions.filter(
        (session) => session.status === "READY_TO_JOIN" || session.status === "IN_PROGRESS",
      ),
    [upcomingSessions],
  );

  const paymentBlockedSessions = useMemo(
    () => upcomingSessions.filter((session) => session.status === "PENDING_PAYMENT"),
    [upcomingSessions],
  );

  const requiresResponseSessions = useMemo(
    () =>
      upcomingSessions.filter(
        (session) => session.status === "PENDING_PRACTITIONER_RESPONSE",
      ),
    [upcomingSessions],
  );

  const attentionCard: AttentionCard =
    pendingRequests.length > 0
        ? {
            heading: t("dashboard.runtime.attention.pendingRequests.heading", {
              count: pendingRequests.length,
            }),
            note: t("dashboard.runtime.attention.pendingRequests.note"),
            href: "/practitioner/dashboard#pending-requests",
            cta: t("dashboard.runtime.attention.pendingRequests.cta"),
            Icon: Zap,
            toneClass:
            "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-200",
        }
      : readySessions.length > 0
        ? {
            heading: t("dashboard.runtime.attention.readySessions.heading", {
              count: readySessions.length,
            }),
            note: t("dashboard.runtime.attention.readySessions.note"),
            href: "/practitioner/sessions",
            cta: t("dashboard.runtime.attention.readySessions.cta"),
            Icon: Radio,
            toneClass:
              "border-primary/20 bg-primary-light text-text-primary dark:border-primary/20 dark:bg-primary/10 dark:text-white/90",
          }
        : requiresResponseSessions.length > 0
          ? {
              heading: t("dashboard.runtime.attention.pendingResponses.heading", {
                count: requiresResponseSessions.length,
              }),
              note: t("dashboard.runtime.attention.pendingResponses.note"),
              href: "/practitioner/sessions",
              cta: t("dashboard.runtime.attention.pendingResponses.cta"),
              Icon: AlertTriangle,
              toneClass:
                "border-accent/25 bg-accent/10 text-text-primary dark:border-accent/30 dark:bg-accent/10 dark:text-white/90",
            }
          : {
              heading: t("dashboard.runtime.attention.clear.heading"),
              note: t("dashboard.runtime.attention.clear.note"),
              href: "/practitioner/availability",
              cta: t("dashboard.runtime.attention.clear.cta"),
              Icon: CheckCircle2,
              toneClass:
                "border-green-200 bg-green-50 text-green-900 dark:border-green-700/30 dark:bg-green-900/10 dark:text-green-200",
            };

  const presence = presenceData?.presence;
  const readinessSummaryKey = getPresenceSummaryKey(
    presence?.status ?? null,
    presence?.isInstantBookingEnabled ?? null,
  );

  return (
    <div className="space-y-6">
      {profileLoading ? (
        <Skeleton className="h-8 w-52 rounded-xl" />
      ) : profileError || !profile ? (
        <div className="rounded-xl border border-border-light bg-white p-5 dark:bg-white/5">
          <p className="mb-3 text-sm text-text-secondary">
            {t("dashboard.feedback.loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetchProfile()}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("dashboard.feedback.retry")}
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-2xl font-semibold text-text-primary dark:text-white/95">
            {greeting}
          </p>
          <p className="text-sm text-text-secondary">
            {t("dashboard.page.subtitle")}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <section className={`rounded-2xl border p-5 ${attentionCard.toneClass}`}>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/70 p-2.5 dark:bg-white/10">
              <attentionCard.Icon size={18} className="shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {t("dashboard.runtime.attention.eyebrow")}
              </p>
              <h2 className="mt-1 text-base font-semibold">{attentionCard.heading}</h2>
              <p className="mt-1 text-sm opacity-90">{attentionCard.note}</p>
              <Link
                href={attentionCard.href as never}
                className="mt-3 inline-flex text-sm font-semibold hover:underline"
              >
                {attentionCard.cta}
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
          <div className="mb-3 flex items-center gap-2">
            <Radio size={15} className="text-primary dark:text-primary-light" />
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("dashboard.runtime.readiness.heading")}
            </h2>
          </div>
          <p className="text-sm text-text-secondary">{t(readinessSummaryKey)}</p>
          <dl className="mt-4 space-y-2 text-xs text-text-secondary">
            <div className="flex items-center justify-between gap-3">
              <dt>{t("dashboard.runtime.readiness.metrics.todaySessions")}</dt>
              <dd className="font-semibold text-text-primary dark:text-white/90">
                {upcomingSessions.length}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>{t("dashboard.runtime.readiness.metrics.joinableNow")}</dt>
              <dd className="font-semibold text-text-primary dark:text-white/90">
                {readySessions.length}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>{t("dashboard.runtime.readiness.metrics.waitingOnPayment")}</dt>
              <dd className="font-semibold text-text-primary dark:text-white/90">
                {paymentBlockedSessions.length}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-8">
        <div className="space-y-6 lg:col-span-5">
          <section>
            <div id="pending-requests" className="scroll-mt-24" />
            <div className="mb-3 flex items-center gap-2">
              <Zap size={15} className="shrink-0 text-amber-500" />
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
                {t("dashboard.workspace.requests.heading")}
              </h2>
              {pendingRequests.length > 0 && (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {pendingRequests.length}
                </span>
              )}
            </div>

            {requestsLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : requestsError ? (
              <div className="rounded-xl border border-border-light bg-white px-4 py-4 dark:bg-white/5">
                <p className="text-sm text-text-secondary">
                  {t("dashboard.workspace.requests.errorNote")}
                </p>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="rounded-xl border border-border-light bg-white px-4 py-4 dark:bg-white/5">
                <p className="text-sm text-text-secondary">
                  {t("dashboard.workspace.requests.emptyNote")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <WorkspaceRequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div id="upcoming-sessions" className="scroll-mt-24" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={15}
                  className="shrink-0 text-primary dark:text-primary-light"
                />
                <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
                  {t("dashboard.workspace.sessions.heading")}
                </h2>
              </div>
              <Link
                href="/practitioner/sessions"
                className="text-xs font-medium text-primary hover:underline dark:text-primary-light"
              >
                {t("dashboard.workspace.sessions.viewAll")}
              </Link>
            </div>

            {sessionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-[74px] rounded-xl" />
                ))}
              </div>
            ) : upcomingSessions.length === 0 ? (
              <div className="rounded-xl border border-border-light bg-white p-6 text-center dark:bg-white/5">
                <CalendarDays size={28} className="mx-auto mb-2 text-text-muted" />
                <p className="text-sm font-medium text-text-primary dark:text-white/90">
                  {t("dashboard.workspace.sessions.emptyHeading")}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {t("dashboard.workspace.sessions.emptyNote")}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border-light bg-white dark:bg-white/5">
                <div className="divide-y divide-border-light dark:divide-white/10">
                  {upcomingSessions.map((session) => (
                    <WorkspaceSessionRow key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5 lg:col-span-3">
          <PresencePanel />

          {!profileLoading && profile && (
            <div className="space-y-2">
              {!profile.isProfileCompleted && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-700/30 dark:bg-amber-900/10">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    {t("dashboard.status.incomplete")}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                    {t("dashboard.status.cannotSubmit")}
                  </p>
                  <Link
                    href="/practitioner/profile"
                    className="mt-2 inline-flex text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                  >
                    {t("dashboard.status.completeNow")} &rarr;
                  </Link>
                </div>
              )}

              <div className="rounded-xl border border-border-light bg-white px-4 py-3.5 dark:bg-white/5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {t("dashboard.applicationStatus.heading")}
                </p>
                <p className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
                  {appStatus
                    ? t(`dashboard.applicationStatus.${appStatus}`)
                    : t("dashboard.applicationStatus.noApplication")}
                </p>
                {!appStatus && profile.canSubmitApplication && (
                  <Link
                    href="/practitioner/application"
                    className="mt-1.5 inline-flex text-xs font-medium text-primary hover:underline"
                  >
                    {t("dashboard.applicationStatus.getStarted")} &rarr;
                  </Link>
                )}
              </div>
            </div>
          )}

          <section>
            <h2 className="mb-2.5 text-sm font-semibold text-text-primary dark:text-white/90">
              {t("dashboard.workspace.links.primaryHeading")}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    href: "/practitioner/sessions",
                    Icon: Calendar,
                    labelKey: "dashboard.workspace.links.sessions",
                  },
                  {
                    href: "/practitioner/availability",
                    Icon: Clock,
                    labelKey: "dashboard.workspace.links.availability",
                  },
                  {
                    href: "/practitioner/support",
                    Icon: MessageSquareText,
                    labelKey: "dashboard.workspace.links.support",
                  },
                  {
                    href: "/practitioner/care-chat",
                    Icon: MessageSquareText,
                    labelKey: "dashboard.workspace.links.careChat",
                  },
                ] as const
              ).map(({ href, Icon, labelKey }) => (
                <Link
                  key={href}
                  href={href as never}
                  className="flex items-center gap-2 rounded-xl border border-border-light bg-white px-3 py-2.5 text-xs font-medium text-text-secondary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:hover:bg-primary/10 dark:hover:text-primary-light"
                >
                  <Icon size={13} className="shrink-0" />
                  {t(labelKey as Parameters<typeof t>[0])}
                </Link>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">
              {t("dashboard.workspace.links.primaryNote")}
            </p>
          </section>

          <section>
            <h2 className="mb-2.5 text-sm font-semibold text-text-primary dark:text-white/90">
              {t("dashboard.workspace.links.financeHeading")}
            </h2>
            <div className="space-y-2">
              {([
                {
                  href: "/practitioner/wallet",
                  Icon: FileText,
                  labelKey: "dashboard.workspace.links.wallet",
                  noteKey: "dashboard.workspace.links.walletNote",
                },
                {
                  href: "/practitioner/ledger",
                  Icon: CalendarDays,
                  labelKey: "dashboard.workspace.links.ledger",
                  noteKey: "dashboard.workspace.links.ledgerNote",
                },
                {
                  href: "/practitioner/settlements",
                  Icon: ShieldCheck,
                  labelKey: "dashboard.workspace.links.settlements",
                  noteKey: "dashboard.workspace.links.settlementsNote",
                },
              ] as WorkspaceFinanceLink[]).map(({ href, Icon, labelKey, noteKey }) => (
                <Link
                  key={href}
                  href={href as never}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border-light bg-white px-3 py-3 transition hover:border-primary/20 hover:bg-surface-tertiary/30 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Icon size={14} className="mt-0.5 shrink-0 text-text-muted" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary dark:text-white/90">
                        {t(labelKey as Parameters<typeof t>[0])}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {t(noteKey as Parameters<typeof t>[0])}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2.5 text-sm font-semibold text-text-primary dark:text-white/90">
              {t("dashboard.workspace.links.secondaryHeading")}
            </h2>
            <div className="space-y-2">
              {([
                {
                  href: "/practitioner/profile",
                  Icon: FileText,
                  labelKey: "dashboard.workspace.links.profile",
                  noteKey: "dashboard.workspace.links.profileNote",
                },
                {
                  href: "/practitioner/application",
                  Icon: ShieldCheck,
                  labelKey: "dashboard.workspace.links.application",
                  noteKey: "dashboard.workspace.links.applicationNote",
                },
                {
                  href: "/practitioner/credentials",
                  Icon: ShieldCheck,
                  labelKey: "dashboard.workspace.links.credentials",
                  noteKey: "dashboard.workspace.links.credentialsNote",
                },
                {
                  href: "/practitioner/specialties",
                  Icon: CalendarDays,
                  labelKey: "dashboard.workspace.links.specialties",
                  noteKey: "dashboard.workspace.links.specialtiesNote",
                },
              ] as WorkspaceSecondaryLink[]).map(({ href, Icon, labelKey, noteKey, badgeKey }) => (
                <Link
                  key={href}
                  href={href as never}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border-light bg-white px-3 py-3 transition hover:border-primary/20 hover:bg-surface-tertiary/30 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Icon size={14} className="mt-0.5 shrink-0 text-text-muted" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary dark:text-white/90">
                        {t(labelKey as Parameters<typeof t>[0])}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {t(noteKey as Parameters<typeof t>[0])}
                      </p>
                    </div>
                  </div>
                  {badgeKey ? (
                    <span className="shrink-0 rounded-full border border-border-light px-2 py-0.5 text-[11px] font-medium text-text-muted dark:border-white/10">
                      {t(badgeKey as Parameters<typeof t>[0])}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
