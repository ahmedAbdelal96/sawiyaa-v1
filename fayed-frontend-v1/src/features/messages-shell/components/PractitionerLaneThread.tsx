"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, Check, CheckCheck, Loader2, SendHorizonal } from "lucide-react";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import {
  useCareChatRealtime,
  type CareChatRealtimeMessage,
} from "@/features/care-chat/hooks/use-care-chat-realtime";
import {
  useAdminCareChatConversation,
  usePatientCareChatConversation,
  usePractitionerCareChatConversation,
  useSendPatientCareChatMessage,
  useSendPractitionerCareChatMessage,
} from "@/features/care-chat/hooks/use-care-chat";
import InlineReportComposer from "@/features/moderation/components/InlineReportComposer";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

type Props = {
  role: UnifiedMessagingRole;
  requestId: string | null;
  conversationId: string | null;
  requestStatus?: string;
  fullViewHref: string;
  locale: string;
  copy: {
    heading: string;
    note: string;
    pendingNote: string;
    empty: string;
    loading: string;
    error: string;
    composerPlaceholder: string;
    send: string;
    openFull: string;
  };
  onOpenFull: () => void;
  onThreadActive?: () => void;
};

function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function isMine(senderRole: string, role: UnifiedMessagingRole) {
  if (role === "patient") return senderRole === "PATIENT";
  if (role === "practitioner") return senderRole === "PRACTITIONER";
  return senderRole === "ADMIN" || senderRole === "SUPPORT_AGENT";
}

export default function PractitionerLaneThread({
  role,
  requestId,
  conversationId,
  requestStatus,
  fullViewHref,
  locale,
  copy,
  onOpenFull,
  onThreadActive,
}: Props) {
  const [messageDraft, setMessageDraft] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const meQuery = useCurrentUser(true);

  const patientConversationQuery = usePatientCareChatConversation(
    role === "patient" ? conversationId : null,
  );
  const practitionerConversationQuery = usePractitionerCareChatConversation(
    role === "practitioner" ? conversationId : null,
  );
  const adminConversationQuery = useAdminCareChatConversation(
    role === "admin" ? conversationId : null,
  );

  const conversationQuery =
    role === "patient"
      ? patientConversationQuery
      : role === "practitioner"
        ? practitionerConversationQuery
        : adminConversationQuery;

  const sendPatientMessage = useSendPatientCareChatMessage(
    conversationId ?? "__conversation_disabled__",
  );
  const sendPractitionerMessage = useSendPractitionerCareChatMessage(
    conversationId ?? "__conversation_disabled__",
  );
  const sendMutation = role === "patient" ? sendPatientMessage : sendPractitionerMessage;

  const conversation = conversationQuery.data?.item ?? null;
  const realtimeThread = useCareChatRealtime({
    conversationId,
    serverMessages: conversation?.messages ?? [],
    currentUserId: meQuery.data?.userId ?? null,
    currentUserRole:
      role === "patient" ? "PATIENT" : role === "practitioner" ? "PRACTITIONER" : "ADMIN",
    refetchConversation: () => conversationQuery.refetch(),
    sendViaRest: (payload) => sendMutation.mutateAsync(payload),
  });
  const messages = useMemo<CareChatRealtimeMessage[]>(
    () => realtimeThread.messages,
    [realtimeThread.messages],
  );

  useEffect(() => {
    setIsReportOpen(false);
  }, [conversationId]);

  useEffect(() => {
    if (!endRef.current) return;
    endRef.current.scrollIntoView({ block: "end" });
  }, [conversationId, messages.length]);

  const canReply =
    role !== "admin" &&
    Boolean(conversationId && conversation?.canSendMessage);

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canReply) return;
    const clean = messageDraft.trim();
    if (!clean) return;
    try {
      setIsSending(true);
      realtimeThread.reportTypingActivity(false);
      await realtimeThread.sendMessage(clean);
      setMessageDraft("");
      onThreadActive?.();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border-light/80 bg-gradient-to-b from-white to-primary-light/60 p-2 shadow-[0_16px_32px_-24px_rgba(68,161,148,0.36)] dark:border-white/10 dark:from-white/5 dark:to-white/3">
      <div className="mb-2 border-b border-border-light/70 pb-2 dark:border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {copy.heading}
            </p>
            <p className="mt-1 text-xs text-text-secondary dark:text-white/70">{copy.note}</p>
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
              href={fullViewHref as never}
              onClick={onOpenFull}
              className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
            >
              {copy.openFull}
            </Link>
          </div>
        </div>
      </div>

      {conversationId && isReportOpen ? (
        <div className="mb-2">
          <InlineReportComposer
            targetType="CARE_CHAT_CONVERSATION"
            targetId={conversationId}
            onClose={() => setIsReportOpen(false)}
          />
        </div>
      ) : null}

      <div className="custom-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-border-light/70 bg-white/75 p-1.5 pe-1 dark:border-white/10 dark:bg-white/5">
        {!requestId ? (
          <div className="rounded-xl bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:bg-white/10 dark:text-white/70">
            {copy.empty}
          </div>
        ) : !conversationId ? (
          <div className="rounded-xl border border-border-light/80 bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:border-white/10 dark:bg-white/10 dark:text-white/70">
            {copy.pendingNote}
            {requestStatus ? ` (${requestStatus})` : ""}
          </div>
        ) : conversationQuery.isLoading ? (
          <div className="rounded-xl bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:bg-white/10 dark:text-white/70">
            {copy.loading}
          </div>
        ) : conversationQuery.isError || !conversation ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {copy.error}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:bg-white/10 dark:text-white/70">
            {copy.empty}
          </div>
        ) : (
          messages.map((entry) => {
            const mine = isMine(entry.senderRole, role);
            return (
              <div key={entry.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] rounded-[14px] border px-2.5 py-1.5 ${
                    mine
                      ? "border-primary/45 bg-gradient-to-br from-primary to-primary-active text-white shadow-[0_12px_24px_-16px_rgba(68,161,148,0.7)]"
                      : "border-border-light/80 bg-white text-text-primary shadow-[0_8px_18px_-16px_rgba(34,52,56,0.2)] dark:border-white/10 dark:bg-white/10 dark:text-white/90"
                  }`}
                >
                  <p className="break-words text-xs leading-4.5">{entry.message}</p>
                  <p
                    className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] ${mine ? "bg-white/14 text-white/80" : "bg-primary-light text-text-muted dark:bg-white/10 dark:text-white/55"}`}
                  >
                    {mine && entry.localStatus === "SENDING" ? (
                      <Loader2 className="me-1 h-3 w-3 animate-spin" />
                    ) : null}
                    {mine && entry.localStatus === "SENT" ? (
                      <Check className="me-1 h-3 w-3" />
                    ) : null}
                    {mine && entry.localStatus === "DELIVERED" ? (
                      <CheckCheck className="me-1 h-3 w-3" />
                    ) : null}
                    {mine && entry.localStatus === "READ" ? (
                      <CheckCheck className="me-1 h-3 w-3 text-primary-light" />
                    ) : null}
                    {formatTime(entry.createdAt, locale)}
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

      <form
        onSubmit={submitReply}
        className="mt-2 flex items-center gap-2 border-t border-border-light/70 pt-2 dark:border-white/10"
      >
        <textarea
          value={messageDraft}
          onChange={(event) => {
            const next = event.target.value;
            setMessageDraft(next);
            realtimeThread.reportTypingActivity(next.trim().length > 0);
          }}
          placeholder={copy.composerPlaceholder}
          rows={1}
          maxLength={4000}
          className="app-control max-h-20 min-h-9 flex-1 resize-none rounded-md border-border-strong bg-white px-2 py-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_14px_-14px_rgba(68,161,148,0.35)] focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/15 dark:bg-white/8"
          disabled={!canReply || isSending || sendMutation.isPending}
        />
        <button
          type="submit"
          disabled={!canReply || messageDraft.trim().length === 0 || isSending || sendMutation.isPending}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-gradient-to-br from-primary to-primary-active px-2.5 text-xs font-semibold text-white shadow-[0_10px_18px_-10px_rgba(68,161,148,0.78)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending || sendMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SendHorizonal className="h-3.5 w-3.5" />
          )}
          {copy.send}
        </button>
      </form>
    </div>
  );
}
