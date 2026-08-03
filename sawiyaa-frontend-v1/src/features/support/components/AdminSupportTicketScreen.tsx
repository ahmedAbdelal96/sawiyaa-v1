"use client";

import { useMemo, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Loader2, Lock, StickyNote, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import {
  useAdminUsersList,
  useAdminUser,
} from "@/features/admin/users/hooks/use-admin-users";
import { toAppError } from "@/lib/api/errors";
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
import { useMySettings } from "@/features/settings/hooks/use-settings";
import {
  formatEffectiveViewerDateTime,
  formatEffectiveViewerTime,
} from "@/lib/time-formatting";

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

function formatTime(
  iso: string | null,
  locale: string,
  timeZone?: string | null,
) {
  if (!iso) return "";
  return formatEffectiveViewerTime(iso, timeZone, { locale });
}

function formatDateTime(
  iso: string | null,
  locale: string,
  timeZone?: string | null,
) {
  if (!iso) return "";
  return formatEffectiveViewerDateTime(iso, timeZone, { locale });
}

function InternalNoteBubble({
  senderRole,
  message,
  createdAt,
  locale,
  timeZone,
}: {
  senderRole: SupportMessageSenderRole;
  message: string;
  createdAt: string;
  locale: string;
  timeZone?: string | null;
}) {
  const t = useTranslations("support.admin");
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
      <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
        {t(`thread.senderRoles.${senderRole}` as Parameters<typeof t>[0])}
      </p>
      <p className="text-text-primary mt-1.5 text-xs leading-relaxed font-semibold whitespace-pre-wrap dark:text-white/90">
        {message}
      </p>
      <p className="text-text-muted mt-2 text-[9px] font-medium">
        {formatDateTime(createdAt, numLocale, timeZone)}
      </p>
    </div>
  );
}

function OperationsPanel({
  ticketId,
  currentUserId,
}: {
  ticketId: string;
  currentUserId: string | null;
}) {
  const t = useTranslations("support.admin");
  const locale = useLocale();
  const ticket = useAdminSupportTicket(ticketId);
  const updateStatus = useUpdateAdminSupportTicketStatus(ticketId);
  const assign = useAssignAdminSupportTicket(ticketId);
  const usersQuery = useAdminUsersList({ page: 1, limit: 100 });
  const adminUsers = usersQuery.data?.items ?? [];

  const [selectedStatus, setSelectedStatus] = useState<
    SupportTicketStatus | ""
  >("");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [statusFeedback, setStatusFeedback] = useState<
    "success" | "error" | null
  >(null);
  const [assignFeedback, setAssignFeedback] = useState<
    "success" | "error" | null
  >(null);
  const [pendingAssignAction, setPendingAssignAction] = useState<
    "assign" | "unassign" | null
  >(null);

  const item = ticket.data?.item;
  const isClosed = item?.status === "CLOSED";
  const assignedAdminUserId = item?.assignedAdminUserId || null;
  const assigneeQuery = useAdminUser(
    assignedAdminUserId!,
    !!assignedAdminUserId,
  );
  const assigneeUser = assigneeQuery.data?.item;

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
      <div className="rounded-3xl border border-slate-200/85 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
        <h3 className="text-text-primary text-xs font-bold dark:text-white">
          {t("operations.status.heading")}
        </h3>

        {isClosed ? (
          <p className="text-text-muted mt-2 text-[11px] leading-relaxed">
            {t("operations.status.closedNote")}
          </p>
        ) : (
          <div className="mt-3.5 space-y-3">
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as SupportTicketStatus)
              }
              className="text-text-primary h-11 w-full cursor-pointer rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-bold outline-none focus:border-teal-500 dark:border-white/10 dark:bg-slate-950/20 dark:text-white"
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
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-600 text-xs font-bold text-white shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition hover:bg-teal-700 active:scale-95 disabled:opacity-40"
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
      <div className="rounded-3xl border border-slate-200/85 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
        <h3 className="text-text-primary text-xs font-bold dark:text-white">
          {t("operations.assign.heading")}
        </h3>

        {item?.assignedAdminUserId && (
          <p className="text-text-secondary mt-2 text-[11px] font-semibold">
            {t("operations.assign.currentLabel")}:{" "}
            <span className="font-bold text-teal-600 dark:text-teal-400">
              {(() => {
                if (item.assignedAdminUserId === currentUserId) {
                  return t("operations.assign.assignedToYou");
                }
                const match = adminUsers.find(
                  (u) => u.id === item.assignedAdminUserId,
                );
                if (match) {
                  return (
                    match.displayName ||
                    match.primaryEmail ||
                    t("operations.assign.fallbackAgent")
                  );
                }
                if (assigneeQuery.isLoading) {
                  return locale === "ar" ? "جارٍ التحميل..." : "Loading...";
                }
                if (assigneeUser) {
                  return (
                    assigneeUser.displayName ||
                    assigneeUser.emails?.[0] ||
                    t("operations.assign.fallbackAgent")
                  );
                }
                return t("operations.assign.fallbackAgent");
              })()}
            </span>
          </p>
        )}

        {!item?.assignedAdminUserId && (
          <p className="text-text-muted mt-2 text-[11px] font-medium">
            {t("detail.unassigned")}
          </p>
        )}

        <div className="mt-3.5 space-y-3">
          <select
            value={assigneeInput}
            onChange={(e) => setAssigneeInput(e.target.value)}
            className="text-text-primary h-11 w-full cursor-pointer rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-bold outline-none focus:border-teal-500 dark:border-white/10 dark:bg-slate-950/20 dark:text-white"
          >
            <option value="">{t("operations.assign.placeholder")}</option>
            {adminUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName ||
                  user.primaryEmail ||
                  t("operations.assign.fallbackAgent")}
              </option>
            ))}
          </select>

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
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-teal-600 text-xs font-bold text-white shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition hover:bg-teal-700 active:scale-95 disabled:opacity-40"
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
                className="text-text-secondary flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-xs font-bold transition hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:text-slate-300 dark:hover:bg-rose-950/25 dark:hover:text-rose-400"
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
  const settingsQuery = useMySettings();
  const viewerTimeZone = settingsQuery.data?.item.preferences.timezone;

  const ticket = useAdminSupportTicket(ticketId);
  const meQuery = useCurrentUser(true);
  const reply = useAddAdminSupportMessage(ticketId);
  const note = useAddAdminInternalNote(ticketId);

  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [noteFeedback, setNoteFeedback] = useState<"success" | "error" | null>(
    null,
  );

  // Clear states when ticket shifts
  useEffect(() => {
    // Clear ticket-local drafts when the selected ticket changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReplyText("");
    setNoteText("");
    setReplyError(null);
    setNoteFeedback(null);
  }, [ticketId]);

  const ticketItem = ticket.data?.item ?? null;
  const isClosed = ticketItem?.status === "CLOSED";
  const currentUserId = meQuery.data?.userId ?? null;
  const hasSupportReplyAccess = Boolean(
    meQuery.data?.roles?.hasAdminRole ||
    meQuery.data?.roles?.hasSupportAgentRole,
  );
  const currentUserRole: SupportMessageSenderRole =
    meQuery.data?.roles?.hasSupportAgentRole &&
    !meQuery.data?.roles?.hasAdminRole
      ? "SUPPORT_AGENT"
      : "ADMIN";

  const canReplyPublicly = Boolean(
    ticketItem &&
    !isClosed &&
    hasSupportReplyAccess &&
    currentUserId &&
    (!ticketItem.assignedAdminUserId ||
      ticketItem.assignedAdminUserId === currentUserId),
  );
  const replyBlockedReason =
    !isClosed &&
    ticketItem?.assignedAdminUserId &&
    currentUserId &&
    ticketItem.assignedAdminUserId !== currentUserId
      ? t("reply.blockedOtherAgent")
      : null;
  const unassignedReplyNotice =
    !isClosed && !ticketItem?.assignedAdminUserId && hasSupportReplyAccess
      ? t("reply.unassignedNotice")
      : null;
  const replyNotice = replyError ?? replyBlockedReason ?? unassignedReplyNotice;
  const replyNoticeTone =
    replyError || replyBlockedReason ? "blocked" : replyNotice ? "info" : null;

  useEffect(() => {
    if (canReplyPublicly) {
      // Clear a stale permission error when public reply becomes available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReplyError(null);
    }
  }, [canReplyPublicly]);

  const realtimeThread = useSupportChatRealtime({
    ticketId,
    serverMessages: ticketItem?.messages ?? [],
    currentUserId,
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
      const mine = myId
        ? msg.senderUserId === myId
        : msg.senderRole === currentUserRole;
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

    if (!canReplyPublicly) {
      setReplyError(replyBlockedReason ?? t("reply.error"));
      return;
    }

    try {
      setIsSending(true);
      realtimeThread.reportTypingActivity(false);
      const ack = await realtimeThread.sendMessage(clean);
      if (ack && !ack.ok) {
        const appErrorCode = ack.code ?? "";
        setReplyError(
          appErrorCode === "SUPPORT_TICKET_ASSIGNED_TO_ANOTHER_AGENT"
            ? t("reply.blockedOtherAgent")
            : t("reply.error"),
        );
        return;
      }
      setReplyError(null);
      setReplyText("");
    } catch (error) {
      const appError = toAppError(error);
      setReplyError(
        appError.code === "SUPPORT_TICKET_ASSIGNED_TO_ANOTHER_AGENT"
          ? t("reply.blockedOtherAgent")
          : t("reply.error"),
      );
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-stretch gap-4 overflow-hidden lg:flex-row lg:gap-5">
      {/* Left Column: Chat Conversation */}
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <ChatConversationPanel
          header={
            <ChatConversationHeader
              title={item.subject}
              subtitle={
                <div className="mt-1 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-teal-100/30 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
                      {t(
                        `categories.${item.category}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </span>
                    <span className="text-text-secondary rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-white/10 dark:text-white">
                      {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        item.priority === "URGENT" || item.priority === "HIGH"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          : "text-text-secondary bg-slate-100 dark:bg-white/10 dark:text-white",
                      )}
                    >
                      {t(
                        `priorities.${item.priority}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </span>
                  </div>
                  <p className="text-text-muted mt-0.5 text-[11px] font-medium">
                    {locale === "ar"
                      ? `تم الإنشاء: ${formatDateTime(item.createdAt, locale, viewerTimeZone)}`
                      : `Created: ${formatDateTime(item.createdAt, locale, viewerTimeZone)}`}
                  </p>
                </div>
              }
              actions={
                <Link
                  href="/admin/messages?lane=support"
                  className="flex items-center justify-center rounded-xl border border-slate-200/50 p-2.5 transition hover:bg-slate-50 lg:hidden dark:border-white/10 dark:hover:bg-white/5"
                >
                  <DirectionalArrowIcon
                    direction="back"
                    className="text-text-primary h-4 w-4"
                  />
                </Link>
              }
            />
          }
          composer={
            !isClosed ? (
              <div className="space-y-2">
                {replyNotice ? (
                  <div
                    className={cn(
                      "mx-4 rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium",
                      replyNoticeTone === "blocked"
                        ? "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                        : "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
                    )}
                  >
                    {replyNotice}
                  </div>
                ) : null}
                <ChatComposer
                  placeholder={t("reply.placeholder")}
                  value={replyText}
                  onChange={(next) => {
                    setReplyText(next);
                    realtimeThread.reportTypingActivity(next.trim().length > 0);
                  }}
                  onSubmit={handleReply}
                  isSubmitting={isSending || reply.isPending}
                  disabled={!canReplyPublicly || reply.isPending}
                />
              </div>
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
                  sentAt: formatTime(msg.createdAt, numLocale, viewerTimeZone),
                  direction: msg.mine ? "outgoing" : "incoming",
                  status: msg.localStatus as any,
                }}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-text-primary text-sm font-semibold dark:text-white/95">
                {t("thread.empty.heading")}
              </p>
              <p className="text-text-secondary mt-1 text-xs">
                {t("thread.empty.note")}
              </p>
            </div>
          )}
          {realtimeThread.isPeerTyping && (
            <div className="mt-2 flex justify-start">
              <div className="border-border-light/80 text-text-muted inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[11px] dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </ChatConversationPanel>
      </div>

      {/* Right Column: Internal Notes and Operations */}
      <div className="custom-scrollbar flex flex-col gap-4 pr-1 pb-4 lg:h-full lg:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:pb-0 xl:w-[360px]">
        <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-text-primary text-sm font-bold dark:text-white/95">
                {t("internalNotes.heading")}
              </h2>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
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
                  timeZone={viewerTimeZone}
                />
              ))}
            </div>
          ) : (
            <p className="text-text-muted mt-3 text-xs">
              {t("internalNotes.empty")}
            </p>
          )}
        </section>

        {!isClosed && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-text-primary text-sm font-bold dark:text-white/95">
                {t("note.heading")}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
              {t("note.note")}
            </p>

            <form className="mt-3 space-y-2.5" onSubmit={handleNote}>
              <textarea
                rows={3}
                maxLength={4000}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t("note.placeholder")}
                className="text-text-primary placeholder:text-text-muted w-full resize-none rounded-2xl border border-amber-200/80 bg-white px-3 py-2 text-xs leading-normal outline-none focus:border-amber-400 dark:border-amber-500/25 dark:bg-slate-900/40 dark:text-white"
              />

              {noteFeedback === "success" && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  {t("note.success")}
                </p>
              )}
              {noteFeedback === "error" && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                  {t("note.error")}
                </p>
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

        <OperationsPanel ticketId={ticketId} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
