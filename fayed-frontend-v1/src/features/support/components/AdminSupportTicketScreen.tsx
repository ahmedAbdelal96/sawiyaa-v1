"use client";

import { useMemo, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Loader2, Lock, StickyNote, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import {
  ChatConversationPanel,
  ChatConversationHeader,
  ChatMessageBubble,
  ChatComposer,
  ChatLoadingState,
  ChatErrorState,
} from "@/components/shared/chat/ChatKit";
import {
  useAddAdminInternalNote,
  useAddAdminSupportMessage,
  useAdminSupportTicket,
  useAssignAdminSupportTicket,
  useUpdateAdminSupportTicketStatus,
} from "../hooks/use-support";
import {
  useSupportChatRealtime,
  type SupportRealtimeMessage,
} from "@/features/support/hooks/use-support-chat-realtime";
import type {
  SupportMessageSenderRole,
  SupportTicketPriority,
  SupportTicketStatus,
} from "../types/support.types";
import { cn } from "@/lib/utils";

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

function formatTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function InternalNoteBubble({
  senderRole,
  message,
  createdAt,
  locale,
}: {
  senderRole: SupportMessageSenderRole;
  message: string;
  createdAt: string;
  locale: string;
}) {
  const t = useTranslations("support.admin");
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 dark:border-amber-500/20 dark:bg-amber-500/10 shadow-sm">
      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
        {t(`thread.senderRoles.${senderRole}` as Parameters<typeof t>[0])}
      </p>
      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-text-primary dark:text-white/90 whitespace-pre-wrap">{message}</p>
      <p className="mt-2 text-[9px] text-text-muted font-medium">{formatDateTime(createdAt, numLocale)}</p>
    </div>
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
      <div className="rounded-3xl border border-slate-200/85 dark:border-white/10 bg-white dark:bg-slate-900/40 p-4 shadow-sm">
        <h3 className="text-xs font-bold text-text-primary dark:text-white">
          {t("operations.status.heading")}
        </h3>

        {isClosed ? (
          <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
            {t("operations.status.closedNote")}
          </p>
        ) : (
          <div className="mt-3.5 space-y-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as SupportTicketStatus)}
              className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950/20 outline-none focus:border-teal-500 font-bold text-text-primary dark:text-white cursor-pointer"
            >
              <option value="">{t("operations.status.label")}</option>
              {ASSIGNABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>

            {statusFeedback === "success" && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                {t("operations.status.success")}
              </p>
            )}
            {statusFeedback === "error" && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                {t("operations.status.error")}
              </p>
            )}

            <button
              type="button"
              disabled={!selectedStatus || updateStatus.isPending}
              onClick={handleStatusSave}
              className="w-full h-11 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition active:scale-95 disabled:opacity-40 shadow-[0_4px_12px_rgba(13,148,136,0.15)] flex items-center justify-center gap-2"
            >
              {updateStatus.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
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
      <div className="rounded-3xl border border-slate-200/85 dark:border-white/10 bg-white dark:bg-slate-900/40 p-4 shadow-sm">
        <h3 className="text-xs font-bold text-text-primary dark:text-white">
          {t("operations.assign.heading")}
        </h3>

        {item?.assignedAdminUserId && (
          <p className="mt-2 text-[11px] text-text-secondary font-semibold">
            {t("operations.assign.currentLabel")}:{" "}
            <span className="font-mono text-teal-600 dark:text-teal-400">{item.assignedAdminUserId.slice(0, 8)}</span>
          </p>
        )}

        {!item?.assignedAdminUserId && (
          <p className="mt-2 text-[11px] text-text-muted font-medium">{t("detail.unassigned")}</p>
        )}

        <div className="mt-3.5 space-y-3">
          <input
            type="text"
            value={assigneeInput}
            onChange={(e) => setAssigneeInput(e.target.value)}
            placeholder={t("operations.assign.placeholder")}
            className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950/20 outline-none focus:border-teal-500 font-semibold text-text-primary dark:text-white"
          />

          {assignFeedback === "success" && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              {t("operations.assign.success")}
            </p>
          )}
          {assignFeedback === "error" && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400">
              {t("operations.assign.error")}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!assigneeInput.trim() || assign.isPending}
              onClick={handleAssign}
              className="flex-1 h-11 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition active:scale-95 disabled:opacity-40 shadow-[0_4px_12px_rgba(13,148,136,0.15)] flex items-center justify-center gap-2"
            >
              {pendingAssignAction === "assign" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
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
                className="px-4 h-11 rounded-full border border-slate-200 dark:border-white/10 text-text-secondary dark:text-slate-300 font-bold text-xs transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/25 dark:hover:text-rose-400 flex items-center justify-center gap-2"
              >
                {pendingAssignAction === "unassign" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
  const router = useRouter();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const ticket = useAdminSupportTicket(ticketId);
  const meQuery = useCurrentUser(true);
  const reply = useAddAdminSupportMessage(ticketId);
  const note = useAddAdminInternalNote(ticketId);

  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState<"success" | "error" | null>(null);

  // Clear states when ticket shifts
  useEffect(() => {
    setReplyText("");
    setNoteText("");
    setNoteFeedback(null);
  }, [ticketId]);

  const ticketItem = ticket.data?.item ?? null;
  const currentUserRole: SupportMessageSenderRole =
    meQuery.data?.roles?.hasSupportAgentRole && !meQuery.data?.roles?.hasAdminRole
      ? "SUPPORT_AGENT"
      : "ADMIN";

  const realtimeThread = useSupportChatRealtime({
    ticketId,
    serverMessages: ticketItem?.messages ?? [],
    currentUserId: meQuery.data?.userId ?? null,
    currentUserRole,
    refetchTicket: () => ticket.refetch(),
    sendViaRest: (payload) => reply.mutateAsync(payload),
  });

  const messages = useMemo<SupportRealtimeMessage[]>(
    () => realtimeThread.messages,
    [realtimeThread.messages],
  );

  const threadMessages = useMemo(() => {
    const myId = meQuery.data?.userId ?? null;
    return messages.map((msg) => {
      const mine = myId ? msg.senderUserId === myId : msg.senderRole === currentUserRole;
      return {
        id: msg.id,
        mine,
        message: msg.message,
        createdAt: msg.createdAt,
        localStatus: mine ? msg.localStatus : undefined,
      };
    });
  }, [messages, meQuery.data?.userId, currentUserRole]);

  const handleReply = async () => {
    const clean = replyText.trim();
    if (!clean) return;
    try {
      setIsSending(true);
      realtimeThread.reportTypingActivity(false);
      await realtimeThread.sendMessage(clean);
      setReplyText("");
    } finally {
      setIsSending(false);
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
    return <ChatLoadingState />;
  }

  if (ticket.isError || !ticket.data) {
    return (
      <ChatErrorState
        title={t("states.detailError.heading")}
        note={t("states.detailError.note")}
        actionLabel={t("states.detailError.back")}
        onAction={() => router.push("/admin/messages?lane=support" as never)}
      />
    );
  }

  const item = ticket.data.item;
  const isClosed = item.status === "CLOSED";

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 h-full min-h-0 items-stretch w-full overflow-hidden">
      {/* Left Column: Chat Conversation */}
      <div className="flex-1 flex flex-col h-full min-h-0">
        <ChatConversationPanel
          header={
            <ChatConversationHeader
              title={item.subject}
              subtitle={
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 border border-teal-100/30">
                      {t(`categories.${item.category}` as Parameters<typeof t>[0])}
                    </span>
                    <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-text-secondary dark:text-white">
                      {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
                    </span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                      item.priority === "URGENT" || item.priority === "HIGH"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        : "bg-slate-100 text-text-secondary dark:bg-white/10 dark:text-white"
                    )}>
                      {t(`priorities.${item.priority}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5 font-medium">
                    {locale === "ar"
                    ? `تم الإنشاء: ${formatDateTime(item.createdAt, locale)}`
                    : `Created: ${formatDateTime(item.createdAt, locale)}`}
                  </p>
                </div>
              }
              actions={
                <Link
                  href="/admin/messages?lane=support"
                  className="lg:hidden p-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition flex items-center justify-center border border-slate-200/50 dark:border-white/10"
                >
                  <DirectionalArrowIcon direction="back" className="h-4 w-4 text-text-primary" />
                </Link>
              }
            />
          }
          composer={
            !isClosed ? (
              <ChatComposer
                placeholder={t("reply.placeholder")}
                value={replyText}
                onChange={(next) => {
                  setReplyText(next);
                  realtimeThread.reportTypingActivity(next.trim().length > 0);
                }}
                onSubmit={handleReply}
                isSubmitting={isSending || reply.isPending}
                disabled={reply.isPending}
              />
            ) : undefined
          }
        >
          {threadMessages.length > 0 ? (
            threadMessages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                message={{
                  id: msg.id,
                  body: msg.message,
                  sentAt: formatTime(msg.createdAt, numLocale),
                  direction: msg.mine ? "outgoing" : "incoming",
                  status: msg.localStatus as any,
                }}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("thread.empty.heading")}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {t("thread.empty.note")}
              </p>
            </div>
          )}
          {realtimeThread.isPeerTyping && (
            <div className="flex justify-start mt-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-border-light/80 bg-white px-2.5 py-1 text-[11px] text-text-muted dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </ChatConversationPanel>
      </div>

      {/* Right Column: Internal Notes and Operations */}
      <div className="flex flex-col gap-4 lg:w-[320px] xl:w-[360px] lg:shrink-0 lg:overflow-y-auto lg:h-full custom-scrollbar pr-1 pb-4 lg:pb-0">
        <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-text-primary dark:text-white/95">
                {t("internalNotes.heading")}
              </h2>
            </div>
            <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              {item.internalNotes.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
            {t("internalNotes.note")}
          </p>

          {item.internalNotes.length > 0 ? (
            <div className="mt-3 space-y-2">
              {item.internalNotes.map((n) => (
                <InternalNoteBubble
                  key={n.id}
                  senderRole="SUPPORT_AGENT"
                  message={n.note}
                  createdAt={n.createdAt}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-text-muted">{t("internalNotes.empty")}</p>
          )}
        </section>

        {!isClosed && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/5 shadow-sm">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-text-primary dark:text-white/95">
                {t("note.heading")}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">{t("note.note")}</p>

            <form className="mt-3 space-y-2.5" onSubmit={handleNote}>
              <textarea
                rows={3}
                maxLength={4000}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t("note.placeholder")}
                className="w-full rounded-2xl border border-amber-200/80 bg-white px-3 py-2 text-xs leading-normal text-text-primary outline-none placeholder:text-text-muted focus:border-amber-400 dark:border-amber-500/25 dark:bg-slate-900/40 dark:text-white resize-none"
              />

              {noteFeedback === "success" && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  {t("note.success")}
                </p>
              )}
              {noteFeedback === "error" && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">{t("note.error")}</p>
              )}

              <button
                type="submit"
                disabled={note.isPending || noteText.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {note.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("note.submitting")}
                  </>
                ) : (
                  <>
                    <StickyNote className="h-3.5 w-3.5" />
                    {t("note.submit")}
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        <OperationsPanel ticketId={ticketId} />
      </div>
    </div>
  );
}
