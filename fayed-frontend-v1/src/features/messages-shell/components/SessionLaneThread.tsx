"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, Check, CheckCheck, Loader2, SendHorizonal } from "lucide-react";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import type { GeneralChatConversationIdentity } from "@/features/chat/types/general-chat.types";
import {
  useGeneralChatMessages,
  useOpenSessionGeneralChat,
  useSendGeneralChatMessage,
} from "@/features/chat/hooks/use-general-chat";
import { useSessionChatRealtime } from "@/features/chat/hooks/use-session-chat-realtime";
import InlineReportComposer from "@/features/moderation/components/InlineReportComposer";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

type Props = {
  sessionId: string;
  sessionTitle: string;
  sessionStatusLabel?: string;
    role: Exclude<UnifiedMessagingRole, "admin">;
    locale: string;
    copy: {
      threadHeading: string;
      threadHint: string;
      sessionReadOnlyHint: string;
      sessionReadOnlyReview: string;
      sessionReadOnlySendBlocked: string;
    openFullChat: string;
    composerPlaceholder: string;
    send: string;
    loading: string;
    empty: string;
    error: string;
  };
  onOpenFullChat: () => void;
  onThreadActive?: () => void;
};

function fullChatHref(role: Exclude<UnifiedMessagingRole, "admin">, sessionId: string) {
  if (role === "patient") return `/patient/sessions/${sessionId}/chat`;
  return `/practitioner/sessions/${sessionId}/chat`;
}

function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function SessionLaneThread({
  sessionId,
  sessionTitle,
  sessionStatusLabel,
  role,
  locale,
  copy,
  onOpenFullChat,
  onThreadActive,
}: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationIdentity, setConversationIdentity] =
    useState<GeneralChatConversationIdentity | null>(null);
  const [message, setMessage] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const activeSignalSentRef = useRef(false);
  const meQuery = useCurrentUser(true);

  const openMutation = useOpenSessionGeneralChat(sessionId);
  const messagesQuery = useGeneralChatMessages(
    conversationId,
    { page: 1, limit: 25 },
    { refetchInterval: false },
  );
  const sendMutation = useSendGeneralChatMessage(conversationId);
  const [isSending, setIsSending] = useState(false);
  const chatAvailability = conversationIdentity?.chatAvailability ?? null;

  const realtimeThread = useSessionChatRealtime({
    conversationId,
    serverMessages: messagesQuery.data?.items ?? [],
    refetchMessages: () => messagesQuery.refetch(),
    sendViaRest: (payload) => sendMutation.mutateAsync(payload),
    currentUserId: meQuery.data?.userId ?? null,
  });

  useEffect(() => {
    setConversationId(null);
    setConversationIdentity(null);
    setIsReportOpen(false);
    activeSignalSentRef.current = false;
    openMutation
      .mutateAsync()
      .then((result) => {
        setConversationId(result.item.conversationId);
        setConversationIdentity(result.item);
      })
      .catch(() => {
        setConversationId(null);
        setConversationIdentity(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const orderedMessages = useMemo(() => {
    const rows = realtimeThread.messages;
    return [...rows].reverse();
  }, [realtimeThread.messages]);

  useEffect(() => {
    if (!endRef.current) return;
    endRef.current.scrollIntoView({ block: "end" });
  }, [orderedMessages.length]);

  useEffect(() => {
    if (activeSignalSentRef.current) return;
    if (!conversationId) return;
    if (openMutation.isPending || messagesQuery.isLoading) return;

    activeSignalSentRef.current = true;
    onThreadActive?.();
  }, [
    conversationId,
    messagesQuery.isLoading,
    onThreadActive,
    openMutation.isPending,
  ]);

  const showComposer =
    Boolean(conversationId) &&
    chatAvailability?.canSend === true &&
    chatAvailability?.readOnly !== true;
  const showAvailabilityLoading =
    chatAvailability == null || !conversationId || openMutation.isPending;
  const showReadOnlyNotice =
    !showAvailabilityLoading &&
    (chatAvailability?.canSend !== true || chatAvailability?.readOnly === true);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!showComposer || message.trim().length === 0) return;
    try {
      setIsSending(true);
      realtimeThread.reportTypingActivity(false);
      await realtimeThread.sendMessage({ message: message.trim() });
      setMessage("");
    } finally {
      setIsSending(false);
    }
  };

  const myUserId = meQuery.data?.userId ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border-light/80 bg-gradient-to-b from-white to-primary-light/60 p-2 shadow-[0_16px_32px_-24px_rgba(68,161,148,0.38)] dark:border-white/10 dark:from-white/5 dark:to-white/3">
      <div className="mb-2 flex items-start justify-between gap-2 border-b border-border-light/70 pb-2 dark:border-white/10">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
            {copy.threadHeading}
          </p>
          <p className="truncate text-xs text-text-secondary dark:text-white/65">
            {sessionTitle}
            {sessionStatusLabel ? ` - ${sessionStatusLabel}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {conversationId ? (
            <button
              type="button"
              onClick={() => setIsReportOpen((current) => !current)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-light bg-white text-text-secondary transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-white/12 dark:bg-white/5 dark:text-white/75 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
              aria-label="Report"
              title="Report"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <Link
            href={fullChatHref(role, sessionId) as never}
            onClick={onOpenFullChat}
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            {copy.openFullChat}
          </Link>
        </div>
      </div>

      {conversationId && isReportOpen ? (
        <div className="mb-2">
          <InlineReportComposer
            targetType="GENERAL_CHAT_CONVERSATION"
            targetId={conversationId}
            onClose={() => setIsReportOpen(false)}
          />
        </div>
      ) : null}

        <div className="custom-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-border-light/70 bg-white/75 p-1.5 pe-1 dark:border-white/10 dark:bg-white/5">
        {openMutation.isPending || messagesQuery.isLoading ? (
          <div className="rounded-xl border border-border-light/70 bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:border-white/10 dark:bg-white/10 dark:text-white/70">
            {copy.loading}
          </div>
        ) : openMutation.isError || messagesQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {copy.error}
          </div>
        ) : orderedMessages.length === 0 ? (
          <div className="rounded-xl bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:bg-white/10 dark:text-white/70">
            {copy.empty}
          </div>
        ) : (
          orderedMessages.map((entry) => {
            const isMine = Boolean(myUserId && entry.senderUserId === myUserId);
            return (
              <div
                key={entry.messageId}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-[14px] border px-2.5 py-1.5 ${
                    isMine
                      ? "border-primary/45 bg-gradient-to-br from-primary to-primary-active text-white shadow-[0_12px_24px_-16px_rgba(68,161,148,0.7)]"
                      : "border-border-light/80 bg-white text-text-primary shadow-[0_8px_18px_-16px_rgba(34,52,56,0.2)] dark:border-white/10 dark:bg-white/10 dark:text-white/90"
                  }`}
                >
                  {entry.contentText ? (
                    <p className="break-words text-xs leading-4.5 tracking-[0.01em]">
                      {entry.contentText}
                    </p>
                  ) : null}
                  <p
                    className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] ${isMine ? "bg-white/14 text-white/80" : "bg-primary-light text-text-muted dark:bg-white/10 dark:text-white/55"}`}
                  >
                    {isMine && entry.localStatus === "SENDING" ? (
                      <Loader2 className="me-1 h-3 w-3 animate-spin" />
                    ) : null}
                    {isMine && entry.localStatus === "SENT" ? (
                      <Check className="me-1 h-3 w-3" />
                    ) : null}
                    {isMine && entry.localStatus === "DELIVERED" ? (
                      <CheckCheck className="me-1 h-3 w-3" />
                    ) : null}
                    {isMine && entry.localStatus === "READ" ? (
                      <CheckCheck className="me-1 h-3 w-3 text-primary-light" />
                    ) : null}
                    {formatTime(entry.sentAt, locale)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {realtimeThread.isPeerTyping ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-1 rounded-full border border-border-light/80 bg-white px-2.5 py-1 text-[11px] text-text-muted dark:border-white/10 dark:bg-white/10 dark:text-white/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
        </div>

        {showAvailabilityLoading ? (
          <div className="mt-2 rounded-xl border border-border-light/70 bg-surface-secondary px-3 py-2 text-xs leading-5 text-text-secondary dark:border-white/10 dark:bg-white/10 dark:text-white/70">
            <p className="font-semibold text-text-primary dark:text-white/90">
              {copy.loading}
            </p>
            <p className="mt-1">{copy.threadHint}</p>
          </div>
        ) : showReadOnlyNotice ? (
          <div className="mt-2 rounded-xl border border-border-light/70 bg-surface-secondary px-3 py-2 text-xs leading-5 text-text-secondary dark:border-white/10 dark:bg-white/10 dark:text-white/70">
            <p className="font-semibold text-text-primary dark:text-white/90">
              {copy.sessionReadOnlyHint}
            </p>
            <p className="mt-1">{copy.sessionReadOnlyReview}</p>
            <p className="mt-1">{copy.sessionReadOnlySendBlocked}</p>
          </div>
        ) : showComposer ? (
          <form
            onSubmit={handleSend}
            className="mt-2 flex items-center gap-2 border-t border-border-light/70 pt-2 dark:border-white/10"
          >
            <textarea
              value={message}
              onChange={(event) => {
                const next = event.target.value;
                setMessage(next);
                realtimeThread.reportTypingActivity(next.trim().length > 0);
              }}
              placeholder={copy.composerPlaceholder}
              rows={1}
              maxLength={1200}
              className="app-control max-h-20 min-h-9 flex-1 resize-none rounded-md border-border-strong bg-white px-2 py-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_14px_-14px_rgba(68,161,148,0.35)] focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/8"
              disabled={!conversationId || isSending}
            />
            <button
              type="submit"
              disabled={message.trim().length === 0 || isSending || openMutation.isPending || sendMutation.isPending}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-gradient-to-br from-primary to-primary-active px-2.5 text-xs font-semibold text-white shadow-[0_10px_18px_-10px_rgba(68,161,148,0.78)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendHorizonal className="h-3.5 w-3.5" />
              )}
              {copy.send}
            </button>
          </form>
        ) : null}
      </div>
  );
}
