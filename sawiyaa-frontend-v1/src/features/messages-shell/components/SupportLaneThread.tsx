"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, Check, CheckCheck, ExternalLink, LifeBuoy, Loader2, Plus, SendHorizonal } from "lucide-react";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import {
  useAddAdminSupportMessage,
  useAddPatientSupportMessage,
  useAddPractitionerSupportMessage,
  useAdminSupportTicket,
  useCreatePatientSupportTicket,
  useCreatePractitionerSupportTicket,
  usePatientSupportTicket,
  usePractitionerSupportTicket,
} from "@/features/support/hooks/use-support";
import {
  useSupportChatRealtime,
  type SupportRealtimeMessage,
} from "@/features/support/hooks/use-support-chat-realtime";
import type {
  SupportMessageSenderRole,
} from "@/features/support/types/support.types";
import InlineReportComposer from "@/features/moderation/components/InlineReportComposer";
import type { UnifiedMessagingRole } from "../types/messages-shell.types";

type Props = {
  role: UnifiedMessagingRole;
  ticketId: string | null;
  fullViewHref: string;
  locale: string;
  prefillRelatedSessionId?: string | null;
  copy: {
    heading: string;
    note: string;
    empty: string;
    loading: string;
    error: string;
    composerPlaceholder: string;
    send: string;
    createHeading: string;
    createNote: string;
    createSubjectPlaceholder: string;
    createMessagePlaceholder: string;
    createAction: string;
    creating: string;
    openFull: string;
  };
  onOpenFull: () => void;
  onCreatedTicket?: (ticketId: string) => void;
  onThreadActive?: () => void;
};

function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function isMine(
  senderRole: SupportMessageSenderRole,
  role: UnifiedMessagingRole,
  senderUserId: string | null,
  currentUserId: string | null,
) {
  if (senderUserId && currentUserId) {
    return senderUserId === currentUserId;
  }
  if (role === "patient") return senderRole === "PATIENT";
  if (role === "practitioner") return senderRole === "PRACTITIONER";
  return senderRole === "ADMIN" || senderRole === "SUPPORT_AGENT";
}

function buildAutoSubjectFromMessage(message: string) {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const base = lines[0] ?? message.trim();
  return base.slice(0, 120);
}

export default function SupportLaneThread({
  role,
  ticketId,
  fullViewHref,
  locale,
  prefillRelatedSessionId,
  copy,
  onOpenFull,
  onCreatedTicket,
  onThreadActive,
}: Props) {
  const [messageDraft, setMessageDraft] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(Boolean(prefillRelatedSessionId));
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const meQuery = useCurrentUser(true);

  const patientTicketQuery = usePatientSupportTicket(role === "patient" ? ticketId : null);
  const practitionerTicketQuery = usePractitionerSupportTicket(
    role === "practitioner" ? ticketId : null,
  );
  const adminTicketQuery = useAdminSupportTicket(role === "admin" ? ticketId : null);

  const ticketQuery =
    role === "patient"
      ? patientTicketQuery
      : role === "practitioner"
        ? practitionerTicketQuery
        : adminTicketQuery;

  const addPatientMessage = useAddPatientSupportMessage(ticketId ?? "__ticket_disabled__");
  const addPractitionerMessage = useAddPractitionerSupportMessage(
    ticketId ?? "__ticket_disabled__",
  );
  const addAdminMessage = useAddAdminSupportMessage(ticketId ?? "__ticket_disabled__");

  const sendMutation =
    role === "patient"
      ? addPatientMessage
      : role === "practitioner"
        ? addPractitionerMessage
        : addAdminMessage;

  const createPatientTicket = useCreatePatientSupportTicket();
  const createPractitionerTicket = useCreatePractitionerSupportTicket();

  const createMutation =
    role === "patient" ? createPatientTicket : createPractitionerTicket;

  useEffect(() => {
    if (prefillRelatedSessionId) {
      setShowCreateForm(true);
    }
  }, [prefillRelatedSessionId]);

  const ticket = ticketQuery.data?.item ?? null;
  const realtimeThread = useSupportChatRealtime({
    ticketId,
    serverMessages: ticket?.messages ?? [],
    currentUserId: meQuery.data?.userId ?? null,
    currentUserRole:
      role === "patient" ? "PATIENT" : role === "practitioner" ? "PRACTITIONER" : "ADMIN",
    refetchTicket: () => ticketQuery.refetch(),
    sendViaRest: (payload) => sendMutation.mutateAsync(payload),
  });
  const messages = useMemo<SupportRealtimeMessage[]>(
    () => realtimeThread.messages,
    [realtimeThread.messages],
  );

  useEffect(() => {
    setIsReportOpen(false);
  }, [ticketId]);

  useEffect(() => {
    if (!endRef.current) return;
    endRef.current.scrollIntoView({ block: "end" });
  }, [ticketId, messages.length]);

  const canCreate = role === "patient" || role === "practitioner";
  const canReply = Boolean(ticketId && ticket);

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

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;

    const description = newMessage.trim();
    if (!description) return;
    const subject = buildAutoSubjectFromMessage(description);
    if (!subject) return;

    const result = await createMutation.mutateAsync({
      category: "GENERAL",
      subject,
      description,
      priority: "NORMAL",
      relatedSessionId: prefillRelatedSessionId?.trim() || undefined,
    });

    setNewMessage("");
    setShowCreateForm(false);
    onCreatedTicket?.(result.item.id);
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border-light/80 bg-gradient-to-b from-white to-primary-light/60 p-2 shadow-[0_16px_32px_-24px_rgba(68,161,148,0.36)] dark:border-white/10 dark:from-white/5 dark:to-white/3">
      <div className="mb-2 flex items-center justify-end gap-1 border-b border-border-light/70 pb-2 dark:border-white/10">
        {ticketId ? (
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
        {canCreate ? (
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-light bg-white text-primary transition hover:border-primary/35 hover:bg-primary/5 dark:border-white/12 dark:bg-white/5 dark:text-white/90"
            aria-label={copy.createAction}
            title={copy.createAction}
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
        <Link
          href={fullViewHref as never}
          onClick={onOpenFull}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-light bg-white text-text-secondary transition hover:border-primary/35 hover:text-primary dark:border-white/12 dark:bg-white/5 dark:text-white/75"
          aria-label={copy.openFull}
          title={copy.openFull}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {ticketId && isReportOpen ? (
        <div className="mb-2">
          <InlineReportComposer
            targetType="SUPPORT_TICKET"
            targetId={ticketId}
            onClose={() => setIsReportOpen(false)}
          />
        </div>
      ) : null}

      {canCreate && showCreateForm ? (
        <div className="mb-2 rounded-xl border border-border-light/80 bg-surface-secondary p-2 dark:border-white/10 dark:bg-white/5">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary dark:bg-primary/20">
            <LifeBuoy className="h-3.5 w-3.5" />
            {copy.createHeading}
          </div>
          {prefillRelatedSessionId ? (
            <div className="mb-1 inline-flex max-w-full rounded-full bg-primary/8 px-2 py-1 text-[10px] font-semibold text-primary dark:bg-primary/15 dark:text-primary-light">
              <span className="truncate">
                {locale.startsWith("ar")
                  ? `الجلسة المرتبطة: ${prefillRelatedSessionId}`
                  : `Related session: ${prefillRelatedSessionId}`}
              </span>
            </div>
          ) : null}
          <form onSubmit={submitCreate}>
            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder={copy.createMessagePlaceholder}
              className="app-control mt-1.5 w-full resize-none px-2 py-1.5 text-xs"
              rows={1}
              maxLength={2000}
              disabled={createMutation.isPending}
            />
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                newMessage.trim().length === 0
              }
              className="mt-1.5 inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {copy.creating}
                </>
              ) : (
                copy.createAction
              )}
            </button>
          </form>
        </div>
      ) : null}

      <div className="custom-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-border-light/70 bg-white/75 p-1.5 pe-1 dark:border-white/10 dark:bg-white/5">
        {!ticketId ? (
          <div className="rounded-xl bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:bg-white/10 dark:text-white/70">
            {copy.empty}
          </div>
        ) : ticketQuery.isLoading ? (
          <div className="rounded-xl bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:bg-white/10 dark:text-white/70">
            {copy.loading}
          </div>
        ) : ticketQuery.isError || !ticket ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {copy.error}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl bg-surface-secondary px-3 py-2 text-xs text-text-secondary dark:bg-white/10 dark:text-white/70">
            {copy.empty}
          </div>
        ) : (
          messages.map((entry) => {
            const mine = isMine(
              entry.senderRole,
              role,
              entry.senderUserId,
              meQuery.data?.userId ?? null,
            );
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
          maxLength={2000}
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
