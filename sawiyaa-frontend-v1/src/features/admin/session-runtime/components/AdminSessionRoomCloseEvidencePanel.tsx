"use client";

import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, MessageSquareText, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatInspectorDateTime } from "../lib/inspector-utils";
import type {
  AdminSessionRelatedSupportTicket,
  AdminSessionVideoRoomCloseEvidence,
} from "../types/admin-session-runtime.types";

function formatSupportCategory(
  category: string,
  tSupport: any,
): string {
  return tSupport(`categories.${category}` as Parameters<typeof tSupport>[0]);
}

function formatSupportStatus(
  status: string,
  tSupport: any,
): string {
  return tSupport(`statuses.${status}` as Parameters<typeof tSupport>[0]);
}

function formatSupportPriority(
  priority: string,
  tSupport: any,
): string {
  return tSupport(`priorities.${priority}` as Parameters<typeof tSupport>[0]);
}

function resolveCloseReason(
  reason: string | null,
  t: any,
): string {
  if (!reason) {
    return t("inspector.notAvailable");
  }

  if (reason === "CLOSED_AFTER_SCHEDULED_END") {
    return t("inspector.roomClose.reasons.closedAfterScheduledEnd");
  }

  if (reason === "TECHNICAL_ISSUE") {
    return t("inspector.roomClose.reasons.technicalIssue");
  }

  return reason
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminSessionRoomCloseEvidencePanel({
  videoRoomClose,
  relatedSupportTickets,
}: {
  videoRoomClose: AdminSessionVideoRoomCloseEvidence;
  relatedSupportTickets: AdminSessionRelatedSupportTicket[];
}) {
  const t = useTranslations("admin-session-runtime");
  const tSupport = useTranslations("support.admin");
  const locale = useLocale();

  const hasCloseDetails = Boolean(
    videoRoomClose.closedAt ||
      videoRoomClose.closedByDisplayName ||
      videoRoomClose.closedByUserId ||
      videoRoomClose.closeReason ||
      videoRoomClose.closeNote,
  );
  const hasTickets = relatedSupportTickets.length > 0;

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
              {t("inspector.roomClose.title")}
            </h2>
            <p className="text-xs text-text-secondary">
              {t("inspector.roomClose.subtitle")}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/80">
          {videoRoomClose.closedAt
            ? t("inspector.roomClose.status.closed")
            : t("inspector.roomClose.status.available")}
        </span>
      </div>

      {!hasCloseDetails && !hasTickets ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border-light bg-surface-tertiary/70 p-4 text-sm text-text-secondary dark:border-white/10 dark:bg-white/[0.02]">
          {t("inspector.roomClose.empty")}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border-light p-4 dark:border-white/8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("inspector.roomClose.fields.closedAt")}
              </p>
              <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                {videoRoomClose.closedAt
                  ? formatInspectorDateTime(videoRoomClose.closedAt, locale)
                  : t("inspector.notAvailable")}
              </p>
            </div>

            <div className="rounded-2xl border border-border-light p-4 dark:border-white/8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("inspector.roomClose.fields.closedBy")}
              </p>
              <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                {videoRoomClose.closedByDisplayName?.trim() ||
                  videoRoomClose.closedByUserId ||
                  t("inspector.notAvailable")}
              </p>
            </div>

            <div className="rounded-2xl border border-border-light p-4 dark:border-white/8 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("inspector.roomClose.fields.reason")}
              </p>
              <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                {resolveCloseReason(videoRoomClose.closeReason, t)}
              </p>
            </div>

            <div className="rounded-2xl border border-border-light p-4 dark:border-white/8 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("inspector.roomClose.fields.note")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary dark:text-white/90">
                {videoRoomClose.closeNote?.trim() || t("inspector.notAvailable")}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border-light bg-surface-tertiary/70 p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("inspector.roomClose.tickets.title")}
                </p>
              </div>
              <p className="text-xs text-text-secondary">
                {hasTickets
                  ? t("inspector.roomClose.tickets.count", {
                      count: relatedSupportTickets.length,
                    })
                  : t("inspector.roomClose.tickets.empty")}
              </p>
            </div>

            {hasTickets ? (
              <div className="mt-4 space-y-3">
                {relatedSupportTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-2xl border border-border-light bg-white p-4 dark:border-white/8 dark:bg-surface-secondary/60"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                          {ticket.subject}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {ticket.id}
                        </p>
                      </div>
                      <Link
                        href={`/admin/support/${ticket.id}` as never}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light px-3 py-1 text-xs font-semibold text-text-brand transition hover:bg-primary/15"
                      >
                        {t("inspector.roomClose.tickets.openTicket")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-surface-tertiary px-2.5 py-1 font-semibold text-text-muted dark:bg-white/10 dark:text-white/80">
                        {formatSupportCategory(ticket.category, tSupport)}
                      </span>
                      <span className="rounded-full bg-surface-tertiary px-2.5 py-1 font-semibold text-text-muted dark:bg-white/10 dark:text-white/80">
                        {formatSupportStatus(ticket.status, tSupport)}
                      </span>
                      <span className="rounded-full bg-surface-tertiary px-2.5 py-1 font-semibold text-text-muted dark:bg-white/10 dark:text-white/80">
                        {formatSupportPriority(ticket.priority, tSupport)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-text-secondary">
                      {ticket.lastMessageAt
                        ? t("inspector.roomClose.tickets.lastUpdated", {
                            date: formatInspectorDateTime(ticket.lastMessageAt, locale),
                          })
                        : t("inspector.roomClose.tickets.createdAt", {
                            date: formatInspectorDateTime(ticket.createdAt, locale),
                          })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border-light bg-white/70 p-4 text-sm text-text-secondary dark:border-white/10 dark:bg-white/[0.02]">
                {t("inspector.roomClose.tickets.noLinkedTickets")}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
