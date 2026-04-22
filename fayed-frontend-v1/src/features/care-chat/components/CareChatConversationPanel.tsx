"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, CheckCheck, Loader2, MessageSquareText, SendHorizonal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { toAppError } from "@/lib/api/errors";
import FullHeightMessagesPage from "@/components/messages/FullHeightMessagesPage";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { CareChatActivityChip } from "./CareChatStatusChip";
import {
  formatCareChatDateTime,
  getCareChatConversationStateKey,
  getCareChatErrorKey,
  getCareChatSenderAlignment,
} from "../lib/care-chat-ui";
import {
  useAdminCareChatConversation,
  usePatientCareChatConversation,
  usePractitionerCareChatConversation,
  useSendPatientCareChatMessage,
  useSendPractitionerCareChatMessage,
} from "../hooks/use-care-chat";
import { useCareChatRealtime, type CareChatRealtimeMessage } from "../hooks/use-care-chat-realtime";
import type { SendCareChatMessageInput } from "../types/care-chat.types";

type Props = {
  conversationId: string;
  scope: "patient" | "practitioner" | "admin";
  backHref: string;
};

export default function CareChatConversationPanel({
  conversationId,
  scope,
  backHref,
}: Props) {
  const t = useTranslations("care-chat");
  const locale = useLocale();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const meQuery = useCurrentUser(true);

  const patientQuery = usePatientCareChatConversation(scope === "patient" ? conversationId : null);
  const practitionerQuery = usePractitionerCareChatConversation(
    scope === "practitioner" ? conversationId : null,
  );
  const adminQuery = useAdminCareChatConversation(scope === "admin" ? conversationId : null);

  const query = scope === "patient" ? patientQuery : scope === "practitioner" ? practitionerQuery : adminQuery;

  const patientSend = useSendPatientCareChatMessage(conversationId);
  const practitionerSend = useSendPractitionerCareChatMessage(conversationId);
  const sendMutation = scope === "patient" ? patientSend : practitionerSend;

  const realtimeConversationId = scope === "admin" ? null : conversationId;
  const sendViaRest = useMemo(
    () =>
      (payload: SendCareChatMessageInput) => {
        if (scope === "admin") {
          return Promise.reject(new Error("CARE_CHAT_READ_ONLY"));
        }
        return (scope === "patient" ? patientSend : practitionerSend).mutateAsync(payload);
      },
    [patientSend, practitionerSend, scope],
  );

  const realtimeThread = useCareChatRealtime({
    conversationId: realtimeConversationId,
    serverMessages: query.data?.item?.messages ?? [],
    currentUserId: meQuery.data?.userId ?? null,
    currentUserRole: scope === "patient" ? "PATIENT" : scope === "practitioner" ? "PRACTITIONER" : "ADMIN",
    refetchConversation: () => query.refetch(),
    sendViaRest,
  });

  const messages = useMemo<CareChatRealtimeMessage[]>(
    () => realtimeThread.messages,
    [realtimeThread.messages],
  );

  useEffect(() => {
    if (!endRef.current) return;
    endRef.current.scrollIntoView({ block: "end" });
  }, [conversationId, messages.length]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (scope === "admin") return;
    const clean = message.trim();
    if (!clean) return;
    try {
      setIsSending(true);
      realtimeThread.reportTypingActivity(false);
      await realtimeThread.sendMessage(clean);
      setMessage("");
    } finally {
      setIsSending(false);
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <ListStateSkeleton items={1} heightClass="h-28" />
        <ListStateSkeleton items={4} heightClass="h-24" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const error = query.error ? toAppError(query.error) : null;
    const isNotFound = error?.statusCode === 404 || error?.code === "conversationNotFound";
    return (
      <StateCard
        title={
          isNotFound
            ? t("common.states.conversationNotFound.heading")
            : t("common.states.conversationError.heading")
        }
        note={
          isNotFound
            ? t("common.states.conversationNotFound.note")
            : t("common.states.conversationError.note")
        }
        action={{
          label: t("common.actions.goBack"),
          href: backHref,
        }}
      />
    );
  }

  const conversation = query.data.item;
  const counterpartName =
    scope === "patient"
      ? conversation.practitioner.displayName ?? t("common.fallbacks.practitioner")
      : conversation.patient.displayName ?? t("common.fallbacks.patient");

  const currentUserId = meQuery.data?.userId ?? null;

  return (
    <FullHeightMessagesPage className="flex flex-col gap-3">
      <section className="app-panel rounded-[24px] p-3 sm:p-4">
        <Link
          href={backHref as never}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <DirectionalArrowIcon direction="back" className="h-4 w-4" />
          {t("common.actions.goBack")}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-primary">
              {t(`common.scopeEyebrows.${scope}` as Parameters<typeof t>[0])}
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-xl">
              {t(`common.conversationTitles.${scope}` as Parameters<typeof t>[0], {
                name: counterpartName,
              })}
            </h1>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {t(
                `common.conversationStateNotes.${getCareChatConversationStateKey(conversation.status)}` as Parameters<typeof t>[0],
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CareChatActivityChip activityState={conversation.activityState} />
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {t(`common.conversationStatuses.${conversation.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-text-muted">
          {conversation.relatedSessionId ? (
            <span className="font-mono">
              {t("common.relatedSessionShort", { id: conversation.relatedSessionId })}
            </span>
          ) : null}
          {conversation.expiresAt ? (
            <span>
              {t("common.expiresAt", {
                date: formatCareChatDateTime(conversation.expiresAt, locale),
              })}
            </span>
          ) : null}
          {conversation.closedAt ? (
            <span>
              {t("common.closedAt", {
                date: formatCareChatDateTime(conversation.closedAt, locale),
              })}
            </span>
          ) : null}
        </div>
      </section>

      <section className="app-panel flex min-h-0 flex-1 flex-col rounded-[24px] p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-border-light/70 pb-2 dark:border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("common.thread.heading")}
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              {scope === "admin"
                ? t("admin.conversation.readOnlyNote")
                : t("common.thread.note")}
            </p>
          </div>
          <span className="app-chip rounded-full px-2.5 py-1 text-[11px] font-medium">
            {t("common.thread.count", { value: messages.length })}
          </span>
        </div>

        {messages.length > 0 ? (
          <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-border-light/70 bg-white/70 p-2 dark:border-white/10 dark:bg-white/5">
            {messages.map((entry) => {
              const fromCurrentActor =
                (currentUserId && entry.senderUserId
                  ? entry.senderUserId === currentUserId
                  : getCareChatSenderAlignment(entry.senderRole, scope)) ?? false;
              return (
                <div
                  key={entry.id}
                  className={`flex ${fromCurrentActor ? "justify-end" : "justify-start"}`}
                >
                <div
                  className={`max-w-[92%] rounded-[14px] border px-2.5 py-1.5 shadow-[0_8px_18px_-16px_rgba(34,52,56,0.2)] sm:max-w-[78%] ${
                      fromCurrentActor
                        ? "border-primary/45 bg-gradient-to-br from-primary to-primary-active text-white shadow-[0_14px_26px_-18px_rgba(68,161,148,0.7)]"
                        : "border-border-light/80 bg-white text-text-primary dark:border-white/10 dark:bg-white/10 dark:text-white/90"
                    }`}
                >
                    <p
                      className={`break-words text-xs leading-4.5 ${
                        fromCurrentActor
                          ? "text-white"
                          : "text-text-primary dark:text-white/90"
                      }`}
                    >
                      {entry.message}
                    </p>
                    <p
                      className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ${
                        fromCurrentActor
                          ? "bg-white/14 text-white/80"
                          : "bg-primary-light text-text-muted dark:bg-white/10 dark:text-white/55"
                      }`}
                    >
                      {fromCurrentActor && entry.localStatus === "SENDING" ? (
                        <Loader2 className="me-1 h-3 w-3 animate-spin" />
                      ) : null}
                      {fromCurrentActor && entry.localStatus === "SENT" ? (
                        <Check className="me-1 h-3 w-3" />
                      ) : null}
                      {fromCurrentActor && entry.localStatus === "DELIVERED" ? (
                        <CheckCheck className="me-1 h-3 w-3" />
                      ) : null}
                      {fromCurrentActor && entry.localStatus === "READ" ? (
                        <CheckCheck className="me-1 h-3 w-3 text-primary-light" />
                      ) : null}
                      {formatCareChatDateTime(entry.createdAt, locale)}
                    </p>
                  </div>
                </div>
              );
            })}
            {scope !== "admin" && realtimeThread.isPeerTyping ? (
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
        ) : (
          <div className="mt-5">
            <StateCard
              icon={<MessageSquareText className="h-5 w-5 text-primary" />}
              title={t("common.thread.empty.heading")}
              note={t("common.thread.empty.note")}
              centered={false}
              className="rounded-[18px] p-4"
            />
          </div>
        )}
      </section>

      {scope !== "admin" ? (
        <section className="app-panel shrink-0 rounded-[24px] p-3 sm:p-4">
          <form className="flex items-end gap-2" onSubmit={handleSubmit}>
            <textarea
              rows={1}
              maxLength={4000}
              value={message}
              onChange={(event) => {
                const next = event.target.value;
                setMessage(next);
                if (conversation.canSendMessage) {
                  realtimeThread.reportTypingActivity(next.trim().length > 0);
                }
              }}
              placeholder={t("common.compose.placeholder")}
              disabled={!conversation.canSendMessage}
              className="app-control max-h-20 min-h-9 flex-1 resize-none rounded-md border-border-strong bg-white px-2 py-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_14px_-14px_rgba(68,161,148,0.35)] focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/8 dark:text-white"
            />

            {sendMutation.isError ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {t(
                  getCareChatErrorKey(sendMutation.error) as Parameters<typeof t>[0],
                )}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                isSending ||
                sendMutation.isPending ||
                message.trim().length === 0 ||
                !conversation.canSendMessage
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-primary-active px-3 text-xs font-semibold text-white shadow-[0_10px_18px_-10px_rgba(68,161,148,0.78)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending || sendMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendHorizonal className="h-3.5 w-3.5" />
              )}
              {t("common.compose.submit")}
            </button>
          </form>
        </section>
      ) : null}
    </FullHeightMessagesPage>
  );
}
