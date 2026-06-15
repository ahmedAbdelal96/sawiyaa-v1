"use client";

import { useLocale, useTranslations } from "next-intl";
import { Stethoscope, UserRound } from "lucide-react";
import type { AdminSessionInspectorRoleAttendanceSummary } from "../types/admin-session-runtime.types";
import {
  formatDurationSeconds,
  formatInspectorDateTime,
} from "../lib/inspector-utils";

type Status = "JOINED" | "NOT_JOINED" | "UNCERTAIN";

function resolveStatus(
  summary: AdminSessionInspectorRoleAttendanceSummary,
): Status {
  if (summary.firstJoinedAt) return "JOINED";
  if (summary.tokenIssuedCount > 0 || summary.hadAnyJoinAttempt) {
    return "UNCERTAIN";
  }
  return "NOT_JOINED";
}

export default function AdminSessionInspectorRoleCard({
  role,
  summary,
}: {
  role: "patient" | "practitioner";
  summary: AdminSessionInspectorRoleAttendanceSummary;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();
  const isPatient = role === "patient";
  const heading = t(
    `inspector.role.${role}` as Parameters<typeof t>[0],
  );
  const Icon = isPatient ? UserRound : Stethoscope;
  const accent = isPatient
    ? "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";

  const status = resolveStatus(summary);
  const statusLabel = (() => {
    switch (status) {
      case "JOINED":
        return t("inspector.role.statusJoined");
      case "NOT_JOINED":
        return t("inspector.role.statusNotJoined");
      default:
        return t("inspector.role.statusUncertain");
    }
  })();
  const statusTone =
    status === "JOINED"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : status === "NOT_JOINED"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

  const presence = formatDurationSeconds(
    summary.totalPresenceSeconds ?? 0,
    locale,
  );

  const notes: string[] = [];
  if (summary.noShowCandidate) notes.push(t("inspector.role.noShowNote"));
  if (summary.reconnectCount > 0) notes.push(t("inspector.role.reconnectNote"));
  if (summary.hasDuplicateLikeJoinEvents)
    notes.push(t("inspector.role.duplicateNote"));

  const firstJoined = formatInspectorDateTime(
    summary.firstJoinedAt,
    locale,
  );
  const lastLeft = formatInspectorDateTime(summary.lastLeftAt, locale);

  const notAvailable = t("inspector.notAvailable");

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${accent}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-base font-semibold text-text-primary dark:text-white/95">
            {heading}
          </h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-border-light p-3 dark:border-white/8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.role.totalPresence")}
          </p>
          <p className="mt-1 text-xl font-semibold text-text-primary dark:text-white/95">
            {presence.value}
            <span className="ms-1 text-sm font-normal text-text-muted">
              {presence.unit}
            </span>
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.role.firstJoinedAt")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {firstJoined}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.role.lastLeftAt")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {lastLeft}
            </p>
          </div>
        </div>

        <dl className="grid gap-1.5 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
            <dt className="text-xs text-text-muted">
              {t("inspector.role.joinCount")}
            </dt>
            <dd className="text-sm font-semibold text-text-primary dark:text-white/95">
              {summary.joinCount ?? 0}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
            <dt className="text-xs text-text-muted">
              {t("inspector.role.platformAttempts")}
            </dt>
            <dd className="text-sm font-semibold text-text-primary dark:text-white/95">
              {summary.hadAnyJoinAttempt
                ? t("labels.yes")
                : notAvailable}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
            <dt className="text-xs text-text-muted">
              {t("inspector.role.blockedAttempts")}
            </dt>
            <dd className="text-sm font-semibold text-text-primary dark:text-white/95">
              {summary.hadBlockedJoinAttempt
                ? t("labels.yes")
                : notAvailable}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
            <dt className="text-xs text-text-muted">
              {t("inspector.role.tokensIssued")}
            </dt>
            <dd className="text-sm font-semibold text-text-primary dark:text-white/95">
              {summary.tokenIssuedCount ?? 0}
            </dd>
          </div>
        </dl>

        <div className="rounded-2xl border border-border-light p-3 dark:border-white/8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.role.notes")}
          </p>
          {notes.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {notes.map((note) => (
                <li
                  key={note}
                  className="flex items-center gap-1.5 text-xs text-text-primary dark:text-white/90"
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  {note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-text-muted">
              {t("inspector.role.noNotes")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
