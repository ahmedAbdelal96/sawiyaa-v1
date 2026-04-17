"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Loader2, Lock, MessageSquare, SendHorizonal, StickyNote } from "lucide-react";
import {
  useAddAdminInternalNote,
  useAddAdminSupportMessage,
  useAdminSupportTicket,
  useAssignAdminSupportTicket,
  useUpdateAdminSupportTicketStatus,
} from "../hooks/use-support";
import type {
  SupportMessageSenderRole,
  SupportTicketPriority,
  SupportTicketStatus,
} from "../types/support.types";

type Props = {
  ticketId: string;
};

const ASSIGNABLE_STATUSES: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "ESCALATED",
  "RESOLVED",
];

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function MessageBubble({
  senderRole,
  message,
  createdAt,
  namespace,
}: {
  senderRole: SupportMessageSenderRole;
  message: string;
  createdAt: string;
  namespace: "thread" | "internalNotes";
}) {
  const t = useTranslations("support.admin");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const fromAdmin = senderRole === "ADMIN" || senderRole === "SUPPORT_AGENT";

  if (namespace === "internalNotes") {
    return (
      <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-500/10">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          {t(`thread.senderRoles.${senderRole}` as Parameters<typeof t>[0])}
        </p>
        <p className="mt-2 text-sm leading-6 text-text-primary dark:text-white/90">{message}</p>
        <p className="mt-2 text-[11px] text-text-muted">
          {formatDateTime(createdAt, numLocale)}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-[24px] px-4 py-3 sm:max-w-[78%] ${
          fromAdmin
            ? "bg-primary text-white"
            : "app-panel-soft text-text-primary dark:text-white/90"
        }`}
      >
        <p className={`text-xs font-semibold ${fromAdmin ? "text-white/80" : "text-primary"}`}>
          {t(`thread.senderRoles.${senderRole}` as Parameters<typeof t>[0])}
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            fromAdmin ? "text-white" : "text-text-primary dark:text-white/90"
          }`}
        >
          {message}
        </p>
        <p className={`mt-2 text-[11px] ${fromAdmin ? "text-white/75" : "text-text-muted"}`}>
          {formatDateTime(createdAt, numLocale)}
        </p>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: SupportTicketStatus }) {
  const t = useTranslations("support.admin");
  return (
    <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
      {t(`statuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function PriorityChip({ priority }: { priority: SupportTicketPriority }) {
  const t = useTranslations("support.admin");
  return (
    <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
      {t(`priorities.${priority}` as Parameters<typeof t>[0])}
    </span>
  );
}

function OperationsPanel({ ticketId }: { ticketId: string }) {
  const t = useTranslations("support.admin");
  const ticket = useAdminSupportTicket(ticketId);
  const updateStatus = useUpdateAdminSupportTicketStatus(ticketId);
  const assign = useAssignAdminSupportTicket(ticketId);

  const [selectedStatus, setSelectedStatus] = useState<SupportTicketStatus | "">("");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [statusFeedback, setStatusFeedback] = useState<"success" | "error" | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<"success" | "error" | null>(null);
  const [pendingAssignAction, setPendingAssignAction] = useState<"assign" | "unassign" | null>(
    null,
  );

  const item = ticket.data?.item;
  const isClosed = item?.status === "CLOSED";

  const handleStatusSave = async () => {
    if (!selectedStatus) return;
    setStatusFeedback(null);
    try {
      await updateStatus.mutateAsync({ status: selectedStatus });
      setSelectedStatus("");
      setStatusFeedback("success");
    } catch {
      setStatusFeedback("error");
    }
  };

  const handleAssign = async () => {
    const id = assigneeInput.trim();
    if (!id) return;
    setAssignFeedback(null);
    setPendingAssignAction("assign");
    try {
      await assign.mutateAsync({ assignedAdminUserId: id });
      setAssigneeInput("");
      setAssignFeedback("success");
    } catch {
      setAssignFeedback("error");
    } finally {
      setPendingAssignAction(null);
    }
  };

  const handleUnassign = async () => {
    setAssignFeedback(null);
    setPendingAssignAction("unassign");
    try {
      await assign.mutateAsync({ assignedAdminUserId: null });
      setAssignFeedback("success");
    } catch {
      setAssignFeedback("error");
    } finally {
      setPendingAssignAction(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status change */}
      <div className="app-panel rounded-[24px] p-4">
        <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("operations.status.heading")}
        </h3>

        {isClosed ? (
          <p className="mt-3 text-xs leading-5 text-text-muted">
            {t("operations.status.closedNote")}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as SupportTicketStatus)}
              className="w-full rounded-2xl border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary/35 dark:bg-white/5 dark:text-white"
            >
              <option value="">{t("operations.status.label")}</option>
              {ASSIGNABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>

            {statusFeedback === "success" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {t("operations.status.success")}
              </p>
            )}
            {statusFeedback === "error" && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {t("operations.status.error")}
              </p>
            )}

            <button
              type="button"
              disabled={!selectedStatus || updateStatus.isPending}
              onClick={handleStatusSave}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateStatus.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("operations.status.saving")}
                </>
              ) : (
                t("operations.status.save")
              )}
            </button>
          </div>
        )}
      </div>

      {/* Assignment */}
      <div className="app-panel rounded-[24px] p-4">
        <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("operations.assign.heading")}
        </h3>

        {item?.assignedAdminUserId && (
          <p className="mt-2 text-xs text-text-secondary">
            {t("operations.assign.currentLabel")}:{" "}
            <span className="font-mono text-primary">{item.assignedAdminUserId.slice(0, 8)}</span>
          </p>
        )}

        {!item?.assignedAdminUserId && (
          <p className="mt-2 text-xs text-text-muted">{t("detail.unassigned")}</p>
        )}

        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={assigneeInput}
            onChange={(e) => setAssigneeInput(e.target.value)}
            placeholder={t("operations.assign.placeholder")}
            className="w-full rounded-2xl border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
          />

          {assignFeedback === "success" && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {t("operations.assign.success")}
            </p>
          )}
          {assignFeedback === "error" && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {t("operations.assign.error")}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!assigneeInput.trim() || assign.isPending}
              onClick={handleAssign}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAssignAction === "assign" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("operations.assign.assigning")}
                </>
              ) : (
                t("operations.assign.assign")
              )}
            </button>

            {item?.assignedAdminUserId && (
              <button
                type="button"
                disabled={assign.isPending}
                onClick={handleUnassign}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
              >
                {pendingAssignAction === "unassign" ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("operations.assign.unassigning")}
                  </>
                ) : (
                  t("operations.assign.unassign")
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupportTicketScreen({ ticketId }: Props) {
  const t = useTranslations("support.admin");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const ticket = useAdminSupportTicket(ticketId);
  const reply = useAddAdminSupportMessage(ticketId);
  const note = useAddAdminInternalNote(ticketId);

  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [replyFeedback, setReplyFeedback] = useState<"success" | "error" | null>(null);
  const [noteFeedback, setNoteFeedback] = useState<"success" | "error" | null>(null);

  const handleReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReplyFeedback(null);
    try {
      await reply.mutateAsync({ message: replyText.trim() });
      setReplyText("");
      setReplyFeedback("success");
    } catch {
      setReplyFeedback("error");
    }
  };

  const handleNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNoteFeedback(null);
    try {
      await note.mutateAsync({ message: noteText.trim() });
      setNoteText("");
      setNoteFeedback("success");
    } catch {
      setNoteFeedback("error");
    }
  };

  if (ticket.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-[28px] bg-surface-tertiary dark:bg-white/10" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="h-80 animate-pulse rounded-[28px] bg-surface-tertiary dark:bg-white/10" />
            <div className="h-48 animate-pulse rounded-[28px] bg-surface-tertiary dark:bg-white/10" />
          </div>
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-[28px] bg-surface-tertiary dark:bg-white/10" />
            <div className="h-40 animate-pulse rounded-[28px] bg-surface-tertiary dark:bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (ticket.isError || !ticket.data) {
    return (
      <div className="app-panel mx-auto max-w-2xl rounded-[28px] p-8 text-center">
        <p className="text-base font-semibold text-text-primary dark:text-white/95">
          {t("states.detailError.heading")}
        </p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          {t("states.detailError.note")}
        </p>
        <Link
          href="/admin/support"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {t("states.detailError.back")}
        </Link>
      </div>
    );
  }

  const item = ticket.data.item;
  const isClosed = item.status === "CLOSED";

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <Link
          href="/admin/support"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {t("detail.back")}
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("detail.eyebrow")}
        </p>
        <h1 className="text-xl font-semibold text-text-primary dark:text-white/95 sm:text-2xl">
          {item.subject}
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          {item.description ?? t("detail.noDescription")}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {t(`categories.${item.category}` as Parameters<typeof t>[0])}
          </span>
          <StatusChip status={item.status} />
          <PriorityChip priority={item.priority} />
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
          <span>{t("detail.createdAt", { date: formatDateTime(item.createdAt, numLocale) })}</span>
          {item.lastMessageAt && (
            <span>
              {t("detail.lastReplyAt", { date: formatDateTime(item.lastMessageAt, numLocale) })}
            </span>
          )}
          {item.resolvedAt && (
            <span>
              {t("detail.resolvedAt", { date: formatDateTime(item.resolvedAt, numLocale) })}
            </span>
          )}
          {item.closedAt && (
            <span>
              {t("detail.closedAt", { date: formatDateTime(item.closedAt, numLocale) })}
            </span>
          )}
          {item.assignedAdminUserId ? (
            <span className="text-primary">
              {t("detail.assignedTo", { id: item.assignedAdminUserId.slice(0, 8) })}
            </span>
          ) : (
            <span>{t("detail.unassigned")}</span>
          )}
        </div>
      </section>

      {/* Two-column body */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Left: thread + internal notes + reply + note forms */}
        <div className="space-y-5">
          {/* Message thread */}
          <section className="app-panel rounded-[28px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                  {t("thread.heading")}
                </h2>
              </div>
              <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                {t("thread.count", { value: item.messages.length })}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">{t("thread.note")}</p>

            {item.messages.length > 0 ? (
              <div className="mt-5 space-y-3">
                {item.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    senderRole={msg.senderRole}
                    message={msg.message}
                    createdAt={msg.createdAt}
                    namespace="thread"
                  />
                ))}
              </div>
            ) : (
              <div className="app-panel-soft mt-4 rounded-[20px] p-4">
                <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {t("thread.empty.heading")}
                </p>
                <p className="mt-1 text-sm text-text-secondary">{t("thread.empty.note")}</p>
              </div>
            )}
          </section>

          {/* Internal notes */}
          <section className="rounded-[28px] border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/20 dark:bg-amber-500/5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                  {t("internalNotes.heading")}
                </h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                {t("internalNotes.count", { value: item.internalNotes.length })}
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              {t("internalNotes.note")}
            </p>

            {item.internalNotes.length > 0 ? (
              <div className="mt-4 space-y-3">
                {item.internalNotes.map((n) => (
                  <MessageBubble
                    key={n.id}
                    senderRole={n.senderRole}
                    message={n.message}
                    createdAt={n.createdAt}
                    namespace="internalNotes"
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">{t("internalNotes.empty")}</p>
            )}
          </section>

          {/* Reply form */}
          {!isClosed && (
            <section className="app-panel rounded-[28px] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <SendHorizonal className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                  {t("reply.heading")}
                </h2>
              </div>
              <p className="mt-1 text-xs text-text-secondary">{t("reply.note")}</p>

              <form className="mt-4 space-y-3" onSubmit={handleReply}>
                <textarea
                  rows={4}
                  maxLength={4000}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t("reply.placeholder")}
                  className="w-full rounded-[20px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
                />

                {replyFeedback === "success" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t("reply.success")}
                  </p>
                )}
                {replyFeedback === "error" && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{t("reply.error")}</p>
                )}

                <button
                  type="submit"
                  disabled={reply.isPending || replyText.trim().length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reply.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("reply.submitting")}
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="h-4 w-4" />
                      {t("reply.submit")}
                    </>
                  )}
                </button>
              </form>
            </section>
          )}

          {/* Internal note form */}
          {!isClosed && (
            <section className="rounded-[28px] border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/20 dark:bg-amber-500/5 sm:p-6">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                  {t("note.heading")}
                </h2>
              </div>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t("note.note")}</p>

              <form className="mt-4 space-y-3" onSubmit={handleNote}>
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t("note.placeholder")}
                  className="w-full rounded-[20px] border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted focus:border-amber-400 dark:border-amber-500/25 dark:bg-white/5 dark:text-white"
                />

                {noteFeedback === "success" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t("note.success")}
                  </p>
                )}
                {noteFeedback === "error" && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{t("note.error")}</p>
                )}

                <button
                  type="submit"
                  disabled={note.isPending || noteText.trim().length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {note.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("note.submitting")}
                    </>
                  ) : (
                    <>
                      <StickyNote className="h-4 w-4" />
                      {t("note.submit")}
                    </>
                  )}
                </button>
              </form>
            </section>
          )}
        </div>

        {/* Right: operations panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <OperationsPanel ticketId={ticketId} />
        </div>
      </div>
    </div>
  );
}
