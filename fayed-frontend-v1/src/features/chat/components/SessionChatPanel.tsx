"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, CheckCheck, Loader2, Paperclip, SendHorizonal, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import FullHeightMessagesPage from "@/components/messages/FullHeightMessagesPage";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import httpClient from "@/lib/api/http-client";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import {
  usePatientSession,
  usePractitionerSession,
} from "@/features/sessions/hooks/use-sessions";
import {
  useCloseGeneralChatConversation,
  useGeneralChatMessages,
  useOpenSessionGeneralChat,
  useSendGeneralChatMessage,
  useUploadGeneralChatAttachment,
} from "../hooks/use-general-chat";
import AvatarText from "@/components/ui/avatar/AvatarText";
import {
  getConversationDisplayName,
  getConversationPrimaryParticipant,
  getConversationSubtitle,
  getMessageSenderIdentity,
  getParticipantAvatarUrl,
  getParticipantDisplayName,
  getParticipantInitials,
  getParticipantSubtitle,
} from "../lib/general-chat-identity";
import { useSessionChatRealtime } from "../hooks/use-session-chat-realtime";
import type {
  GeneralChatAttachmentRef,
  GeneralChatConversationIdentity,
  GeneralChatParticipantIdentity,
  GeneralChatMessageItem,
} from "../types/general-chat.types";

type Props = {
  sessionId: string;
  scope: "patient" | "practitioner";
};

function formatTime(iso: string, locale: string) {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
}

function normalizeApiPath(pathOrUrl: string) {
  return pathOrUrl.startsWith("/api/v1/") ? pathOrUrl.slice("/api/v1".length) : pathOrUrl;
}

export default function SessionChatPanel({ sessionId, scope }: Props) {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const meQuery = useCurrentUser(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  const patientSessionQuery = usePatientSession(scope === "patient" ? sessionId : null);
  const practitionerSessionQuery = usePractitionerSession(
    scope === "practitioner" ? sessionId : null,
  );
  const sessionQuery = scope === "patient" ? patientSessionQuery : practitionerSessionQuery;

  const session = sessionQuery.data ?? null;
  const chatAllowed = session?.chatAvailability?.canRead ?? false;

  const openMutation = useOpenSessionGeneralChat(sessionId);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationIdentity, setConversationIdentity] =
    useState<GeneralChatConversationIdentity | null>(null);
  const sessionChatAvailability =
    conversationIdentity?.chatAvailability ?? session?.chatAvailability ?? null;

  useEffect(() => {
    if (!chatAllowed) return;
    if (conversationId) return;
    if (openMutation.isPending) return;

    openMutation
      .mutateAsync()
      .then((data) => {
        setConversationId(data.item.conversationId);
        setConversationIdentity(data.item);
      })
      .catch(() => {
        // handled by UI states
      });
  }, [chatAllowed, conversationId, openMutation]);

  const messagesQuery = useGeneralChatMessages(
    conversationId,
    { page: 1, limit: 30 },
    { refetchInterval: false },
  );
  const sendMutation = useSendGeneralChatMessage(conversationId);
  const uploadMutation = useUploadGeneralChatAttachment(conversationId);
  const closeMutation = useCloseGeneralChatConversation(conversationId);

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<GeneralChatAttachmentRef[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const realtimeThread = useSessionChatRealtime({
    conversationId,
    serverMessages: messagesQuery.data?.items ?? [],
    refetchMessages: () => messagesQuery.refetch(),
    sendViaRest: (payload) => sendMutation.mutateAsync(payload),
    currentUserId: meQuery.data?.userId ?? null,
  });

  const ordered = useMemo(() => {
    const items = realtimeThread.messages;
    return [...items].reverse(); // show oldest -> newest for readability
  }, [realtimeThread.messages]);

  const messageRows = useMemo(() => {
    return ordered.map((message, index) => {
      const previous = index > 0 ? ordered[index - 1] : null;
      const next = index < ordered.length - 1 ? ordered[index + 1] : null;

      return {
        message,
        isGroupStart:
          !previous || previous.senderUserId !== message.senderUserId || previous.messageType === "SYSTEM" || message.messageType === "SYSTEM",
        isGroupEnd:
          !next || next.senderUserId !== message.senderUserId || next.messageType === "SYSTEM" || message.messageType === "SYSTEM",
      };
    });
  }, [ordered]);

  useEffect(() => {
    if (!endRef.current) return;
    endRef.current.scrollIntoView({ block: "end" });
  }, [conversationId, ordered.length]);

  const counterpartName = useMemo(() => {
    const fallbackName =
      scope === "patient"
        ? session?.practitioner.displayName ?? null
        : session?.patient?.displayName ?? null;
    const primaryParticipant = getConversationPrimaryParticipant(
      conversationIdentity,
      meQuery.data?.userId ?? null,
    );

    return (
      getParticipantDisplayName(
        primaryParticipant,
        fallbackName ?? t("detail.chat.fallbackName"),
      ) ?? fallbackName
    );
  }, [conversationIdentity, meQuery.data?.userId, scope, session, t]);
  const sessionTitle =
    scope === "patient"
      ? session?.practitioner.displayName ?? null
      : session?.patient?.displayName ?? null;

  const backHref = scope === "patient" ? "/patient/sessions" : "/practitioner/sessions";
  const sessionDetailsHref =
    scope === "patient"
      ? (`/patient/sessions/${sessionId}` as never)
      : (`/practitioner/sessions/${sessionId}` as never);
  const showComposer =
    Boolean(conversationId) &&
    sessionChatAvailability?.canSend === true &&
    sessionChatAvailability?.readOnly !== true;
  const showAvailabilityLoading =
    sessionChatAvailability == null || !conversationId || openMutation.isPending;
  const showReadOnlyNotice =
    !showAvailabilityLoading &&
    (sessionChatAvailability?.canSend !== true || sessionChatAvailability?.readOnly === true);

  const handlePickFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!conversationId) return;

    const existing = attachments.length;
    const maxToAdd = Math.max(0, 5 - existing);
    const toUpload = Array.from(files).slice(0, maxToAdd);

    for (const file of toUpload) {
      try {
        const result = await uploadMutation.mutateAsync(file);
        setAttachments((current) => [...current, result.item]);
      } catch {
        // handled by uploadMutation.isError
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (fileId: string) => {
    setAttachments((current) => current.filter((a) => a.fileId !== fileId));
  };

  const handleOpenAttachment = async (fileUrl: string) => {
    const response = await httpClient.get(normalizeApiPath(fileUrl), {
      responseType: "blob",
    });

    const blob = response.data as Blob;
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!conversationId) return;

    const content = message.trim();
    if (content.length === 0) return;

    try {
      setIsSending(true);
      realtimeThread.reportTypingActivity(false);
      await realtimeThread.sendMessage({
        message: content,
        attachments:
          attachments.length > 0
            ? attachments.map((item) => ({
                fileId: item.fileId,
                fileUrl: item.fileUrl,
                mimeType: item.mimeType,
                fileSize: item.fileSize ?? undefined,
                originalName: item.originalName ?? undefined,
              }))
            : undefined,
      });
      setMessage("");
      setAttachments([]);
    } finally {
      setIsSending(false);
    }
  };

  if (sessionQuery.isLoading || meQuery.isLoading) {
    return (
      <div className="space-y-4">
        <ListStateSkeleton items={1} heightClass="h-28" />
        <ListStateSkeleton items={6} heightClass="h-20" />
      </div>
    );
  }

  if (sessionQuery.isError || !session) {
    return (
      <StateCard
        title={t("detail.chat.states.sessionError.heading")}
        note={t("detail.chat.states.sessionError.note")}
        action={{
          label: t("detail.chat.states.sessionError.retry"),
          onClick: () => sessionQuery.refetch(),
        }}
      />
    );
  }

  if (!chatAllowed) {
    return (
      <StateCard
        title={t("detail.chat.states.notAvailable.heading")}
        note={t("detail.chat.states.notAvailable.note")}
        action={{
          label: t("detail.chat.states.notAvailable.backToSession"),
          href: (
            <Link
              href={sessionDetailsHref}
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("detail.chat.states.notAvailable.backToSession")}
            </Link>
          ),
        }}
      />
    );
  }

  const myUserId = meQuery.data?.userId ?? null;


  return (
    <FullHeightMessagesPage className="mx-auto flex max-w-3xl flex-col gap-3">
      <section className="app-panel rounded-[24px] p-3 sm:p-4">
        <Link
          href={backHref as never}
          className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
        >
          <DirectionalArrowIcon direction="back" className="h-4 w-4" />
          {t("detail.chat.back")}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light text-primary ring-1 ring-primary/15">
              {getParticipantAvatarUrl(
                getConversationPrimaryParticipant(
                  conversationIdentity,
                  meQuery.data?.userId ?? null,
                ),
              ) ? (
                <img
                  src={
                    getParticipantAvatarUrl(
                      getConversationPrimaryParticipant(
                        conversationIdentity,
                        meQuery.data?.userId ?? null,
                      ),
                    ) as string
                  }
                  alt={counterpartName ?? t("detail.chat.fallbackName")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <AvatarText
                  name={counterpartName ?? t("detail.chat.fallbackName")}
                  className="h-12 w-12"
                />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-xl">
                {counterpartName ?? t("detail.chat.fallbackName")}
              </h1>
              <p className="mt-1 truncate text-xs leading-5 text-text-secondary">
                {getConversationSubtitle(conversationIdentity, meQuery.data?.userId ?? null) ??
                  sessionTitle}
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {t("detail.chat.note")}
              </p>
            </div>
          </div>

          {scope === "practitioner" ? (
            <button
              type="button"
              disabled={!conversationId || closeMutation.isPending}
              onClick={() => closeMutation.mutateAsync().catch(() => {})}
              className="inline-flex items-center justify-center rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:border-danger-500/40 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/90"
            >
              {closeMutation.isPending
                ? t("detail.chat.actions.closing")
                : t("detail.chat.actions.close")}
            </button>
          ) : null}
        </div>
      </section>

      <section className="app-panel flex min-h-0 flex-1 flex-col rounded-[24px] p-0">
        <div className="border-b border-border-light px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("detail.chat.thread.heading")}
            </h2>
            {messagesQuery.isFetching ? (
              <span className="inline-flex items-center gap-2 text-xs text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("detail.chat.thread.refreshing")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
          {openMutation.isPending || messagesQuery.isLoading ? (
            <ListStateSkeleton items={6} heightClass="h-20" />
          ) : openMutation.isError ? (
            <StateCard
              title={t("detail.chat.states.openError.heading")}
              note={t("detail.chat.states.openError.note")}
              action={{
                label: t("detail.chat.states.openError.retry"),
                onClick: () => openMutation.reset(),
              }}
              centered={false}
              className="rounded-[24px] p-5"
            />
          ) : messagesQuery.isError ? (
            <StateCard
              title={t("detail.chat.states.messagesError.heading")}
              note={t("detail.chat.states.messagesError.note")}
              action={{
                label: t("detail.chat.states.messagesError.retry"),
                onClick: () => messagesQuery.refetch(),
              }}
              centered={false}
              className="rounded-[24px] p-5"
            />
          ) : ordered.length === 0 ? (
            <StateCard
              title={t("detail.chat.states.empty.heading")}
              note={t("detail.chat.states.empty.note")}
              centered={false}
              className="rounded-[24px] p-5"
            />
          ) : (
            messageRows.map(({ message: entry, isGroupStart }) => {
              const fromMe = Boolean(myUserId && entry.senderUserId === myUserId);
              const senderIdentity =
                entry.senderIdentity ?? getMessageSenderIdentity(entry, conversationIdentity);
              const senderParticipant: {
                identity: GeneralChatParticipantIdentity | null;
              } | null = senderIdentity
                ? "identity" in senderIdentity
                  ? senderIdentity
                  : { identity: senderIdentity }
                : null;
              const senderName = fromMe
                ? t("detail.chat.you")
                : getParticipantDisplayName(senderParticipant, t("detail.chat.fallbackName"));
              const senderSubtitle = fromMe
                ? t("detail.chat.youSubtitle")
                : getParticipantSubtitle(senderParticipant, null);
              const senderAvatarUrl = fromMe ? null : getParticipantAvatarUrl(senderParticipant);

              return (
                <div
                  key={entry.messageId}
                  className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[92%] flex-col ${fromMe ? "items-end" : "items-start"}`}>
                    {isGroupStart ? (
                      <div className={`mb-1 flex items-center gap-2 ${fromMe ? "flex-row-reverse" : ""}`}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light text-primary ring-1 ring-primary/15">
                          {senderAvatarUrl ? (
                            <img
                              src={senderAvatarUrl}
                              alt={senderName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <AvatarText name={senderName} className="h-8 w-8" />
                          )}
                        </div>
                        <div className={`min-w-0 ${fromMe ? "text-end" : "text-start"}`}>
                          <p className="truncate text-[11px] font-semibold text-text-primary dark:text-white/90">
                            {senderName}
                          </p>
                          {senderSubtitle ? (
                            <p className="truncate text-[10px] text-text-muted dark:text-white/55">
                              {senderSubtitle}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div
                      className={`max-w-full rounded-[14px] border px-2.5 py-1.5 ${
                        fromMe
                          ? "border-primary/45 bg-gradient-to-br from-primary to-primary-active text-white shadow-[0_14px_26px_-18px_rgba(68,161,148,0.7)]"
                          : "border-border-light/80 bg-white text-text-primary shadow-[0_8px_18px_-16px_rgba(34,52,56,0.2)] dark:border-white/10 dark:bg-white/10 dark:text-white/90"
                      }`}
                    >
                      {entry.contentText ? (
                        <p className="break-words text-xs leading-4.5 tracking-[0.01em]">
                          {entry.contentText}
                        </p>
                      ) : null}

                      {entry.attachments.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {entry.attachments.map((att) => (
                            <button
                              key={att.fileId}
                              type="button"
                              onClick={() => handleOpenAttachment(att.fileUrl).catch(() => {})}
                              className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-xs font-medium transition ${
                                fromMe
                                  ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                                  : "border-border-light bg-white text-text-primary hover:border-primary/30 dark:bg-white/5 dark:text-white/90"
                              }`}
                            >
                              <span className="min-w-0 break-words">
                                {att.originalName ?? att.mimeType}
                              </span>
                              <span className="shrink-0 opacity-75">
                                {t("detail.chat.thread.attachment")}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <p
                        className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ${
                          fromMe
                            ? "bg-white/14 text-white/80"
                            : "bg-primary-light text-text-muted dark:bg-white/10 dark:text-white/55"
                        }`}
                      >
                        {fromMe && entry.localStatus === "SENDING" ? (
                          <Loader2 className="me-1 h-3 w-3 animate-spin" />
                        ) : null}
                        {fromMe && entry.localStatus === "SENT" ? (
                          <Check className="me-1 h-3 w-3" />
                        ) : null}
                        {fromMe && entry.localStatus === "DELIVERED" ? (
                          <CheckCheck className="me-1 h-3 w-3" />
                        ) : null}
                        {fromMe && entry.localStatus === "READ" ? (
                          <CheckCheck className="me-1 h-3 w-3 text-primary-light" />
                        ) : null}
                        {formatTime(entry.sentAt, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {realtimeThread.isPeerTyping ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-1 rounded-full border border-border-light bg-surface-secondary px-3 py-1 text-[11px] text-text-muted dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 border-t border-border-light px-3 py-3 sm:px-4">
          {showAvailabilityLoading ? (
            <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-xs leading-6 text-text-secondary dark:bg-white/5">
              <p className="font-semibold text-text-primary dark:text-white/90">
                {t("detail.chat.states.availabilityLoading.heading")}
              </p>
              <p className="mt-1">{t("detail.chat.states.availabilityLoading.note")}</p>
            </div>
          ) : showReadOnlyNotice ? (
            <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-3 text-xs leading-6 text-text-secondary dark:bg-white/5">
              <p className="font-semibold text-text-primary dark:text-white/90">
                {t("detail.chat.states.readOnly.heading")}
              </p>
              <p className="mt-1">{t("detail.chat.states.readOnly.review")}</p>
              <p className="mt-1">{t("detail.chat.states.readOnly.sendBlocked")}</p>
            </div>
          ) : showComposer ? (
            <form onSubmit={handleSend} className="space-y-2">
              {attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <span
                      key={att.fileId}
                      className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1 text-xs font-medium text-text-primary dark:bg-white/5 dark:text-white/90"
                    >
                      <span className="break-words">
                        {att.originalName ?? att.mimeType}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.fileId)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-light text-text-muted transition hover:text-danger-600"
                        aria-label={t("detail.chat.actions.removeAttachment")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex items-end gap-2">
                <label className="sr-only">{t("detail.chat.compose.label")}</label>
                <textarea
                  rows={1}
                  value={message}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMessage(next);
                    realtimeThread.reportTypingActivity(next.trim().length > 0);
                  }}
                  maxLength={4000}
                  disabled={!conversationId || isSending}
                  placeholder={t("detail.chat.compose.placeholder")}
                  className="app-control max-h-20 min-h-9 flex-1 resize-none rounded-md border-border-strong bg-white px-2 py-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_14px_-14px_rgba(68,161,148,0.35)] focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/8 dark:text-white"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <button
                  type="button"
                  onClick={handlePickFiles}
                  disabled={
                    !conversationId ||
                    uploadMutation.isPending ||
                    attachments.length >= 5 ||
                    sessionChatAvailability?.readOnly === true
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-light bg-white text-text-secondary transition hover:border-primary/35 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/12 dark:bg-white/5 dark:text-white/75"
                  aria-label={t("detail.chat.actions.attach")}
                  title={t("detail.chat.actions.attach")}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={message.trim().length === 0 || isSending || closeMutation.isPending}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-primary-active px-3 text-xs font-semibold text-white shadow-[0_10px_18px_-10px_rgba(68,161,148,0.78)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SendHorizonal className="h-3.5 w-3.5" />
                  )}
                  {t("detail.chat.actions.send")}
                </button>
              </div>

              {sendMutation.isError ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {t("detail.chat.states.sendError")}
                </p>
              ) : null}
              {uploadMutation.isError ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {t("detail.chat.states.uploadError")}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>
      </section>
    </FullHeightMessagesPage>
  );
}
