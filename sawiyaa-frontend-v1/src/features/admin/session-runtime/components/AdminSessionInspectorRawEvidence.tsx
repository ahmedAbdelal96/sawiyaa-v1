"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Code2 } from "lucide-react";
import type { AdminSessionAttendanceResponseData } from "../types/admin-session-runtime.types";

/**
 * Technical-details accordion — collapsed by default. Renders a sanitized JSON
 * summary of the attendance response so admins can inspect what the engine
 * actually saw, without exposing provider tokens or room secrets.
 */
function buildRawPayload(data: AdminSessionAttendanceResponseData) {
  const sanitizedEvents = data.timeline.map((event) => ({
    id: event.id,
    attendanceEventType: event.attendanceEventType,
    participantRole: event.participantRole,
    provider: event.provider,
    providerEventType: event.providerEventType,
    providerEventRef: event.providerEventRef,
    providerRoomRef: event.providerRoomRef,
    providerParticipantRef: event.providerParticipantRef,
    occurredAt: event.occurredAt,
    ingestedAt: event.ingestedAt,
  }));

  const relatedSupportTickets = (data.relatedSupportTickets ?? []).map((ticket) => ({
    id: ticket.id,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    subject: ticket.subject,
    lastMessageAt: ticket.lastMessageAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  }));

  return {
    sessionId: data.sessionId,
    summary: data.summary,
    timelineEventCount: data.timeline.length,
    timeline: sanitizedEvents,
    videoRoomClose: data.videoRoomClose,
    relatedSupportTicketCount: relatedSupportTickets.length,
    relatedSupportTickets,
    extendedSummary: data.extendedSummary,
  };
}

export default function AdminSessionInspectorRawEvidence({
  data,
}: {
  data: AdminSessionAttendanceResponseData;
}) {
  const t = useTranslations("admin-session-runtime");
  const [open, setOpen] = useState(false);
  const payload = buildRawPayload(data);
  const json = JSON.stringify(payload, null, 2);

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-start"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/70">
            <Code2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
              {t("inspector.raw.title")}
            </h2>
            <p className="text-xs text-text-secondary">
              {t("inspector.raw.subtitle")}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <pre className="mt-4 max-h-[480px] overflow-auto rounded-2xl border border-border-light bg-surface-tertiary p-4 text-[11px] leading-5 text-text-secondary dark:border-white/8 dark:bg-white/[0.03] dark:text-white/80">
          <code>{json}</code>
        </pre>
      ) : null}
    </section>
  );
}
