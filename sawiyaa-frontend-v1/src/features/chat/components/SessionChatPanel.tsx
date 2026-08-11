"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  CheckCheck,
  Loader2,
  Paperclip,
  SendHorizonal,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  ListStateSkeleton,
  StateCard,
} from "@/components/shared/ContentStates";
import FullHeightMessagesPage from "@/components/messages/FullHeightMessagesPage";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import {
  ChatConversationPanel,
  ChatConversationHeader,
  ChatMessageBubble,
  ChatComposer,
} from "@/components/shared/chat/ChatKit";
import httpClient from "@/lib/api/http-client";
import { toAppError } from "@/lib/api/errors";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import {
  usePatientSession,
  usePractitionerSession,
} from "@/features/sessions/hooks/use-sessions";
import {
  useCloseGeneralChatConversation,
  useGeneralChatMessages,
  useSessionGeneralChatConversation,
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
import ChatModerationReportAction from "@/features/moderation/components/ChatModerationReportAction";
import SessionCodeReference from "@/components/shared/SessionCodeReference";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { formatEffectiveViewerTime } from "@/lib/time-formatting";

type Props = {
  sessionId: string;
  scope: "patient" | "practitioner";
  variant?: "page" | "embedded";
};

function normalizeApiPath(pathOrUrl: string) {
  return pathOrUrl.startsWith("/api/v1/")
    ? pathOrUrl.slice("/api/v1".length)
    : pathOrUrl;
}

export default function SessionChatPanel({
  sessionId,
  scope,
  variant = "page",
}: Props) {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const meQuery = useCurrentUser(true);
  const patientProfileQuery = usePatientProfile(scope === "patient");
  const practitionerProfileQuery = usePractitionerProfile(
    scope === "practitioner",
  );
  const viewerTimeZone =
    scope === "patient"
      ? patientProfileQuery.data?.profile.timezone
      : practitionerProfileQuery.data?.profile.timezone;
  const endRef = useRef<HTMLDivElement | null>(null);

  const patientSessionQuery = usePatientSession(
    scope === "patient" ? sessionId : null,
  );
  const practitionerSessionQuery = usePractitionerSession(
    scope === "practitioner" ? sessionId : null,
  );
  const sessionQuery =
    scope === "patient" ? patientSessionQuery : practitionerSessionQuery;

  const session = sessionQuery.data ?? null;
  const chatAllowed = session?.chatAvailability?.canRead ?? false;

  const sessionConversationQuery = useSessionGeneralChatConversation(
    chatAllowed ? sessionId : null,
  );
  const conversationId =
    sessionConversationQuery.data?.item?.conversationId ?? null;
  const conversationIdentity = useMemo<GeneralChatConversationIdentity | null>(() => {
    const item = sessionConversationQuery.data?.item;
    if (!item) return null;
    return {
      ...item,
      conversationType: "SYSTEM",
      wasCreated: false,
    } as GeneralChatConversationIdentity;
  }, [sessionConversationQuery.data?.item]);
  const sessionChatAvailability =
    conversationIdentity?.chatAvailability ??
    sessionConversationQuery.data?.chatAvailability ??
    session?.chatAvailability ??
    null;

  const errorObj = sessionConversationQuery.error
    ? toAppError(sessionConversationQuery.error)
    : null;
  const isForbidden =
    errorObj?.status === 403 ||
    errorObj?.code === "GENERAL_CHAT_LINKED_SESSION_FORBIDDEN";
  const openErrorTitle = isForbidden
    ? locale === "ar"
      ? "لا يمكنك الوصول إلى محادثة هذه الجلسة."
      : "You do not have access to this session's conversation."
    : locale === "ar"
      ? "تعذر فتح محادثة الجلسة الآن."
      : "Could not open session chat right now.";
  const openErrorNote = isForbidden
    ? ""
    : locale === "ar"
      ? "حاول مرة أخرى."
      : "Please try again.";

  const messagesQuery = useGeneralChatMessages(
    conversationId,
    { page: 1, limit: 30 },
    { refetchInterval: false },
  );
  const sendMutation = useSendGeneralChatMessage(conversationId);
  const uploadMutation = useUploadGeneralChatAttachment(conversationId);
  const closeMutation = useCloseGeneralChatConversation(conversationId);

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<GeneralChatAttachmentRef[]>(
    [],
  );
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
          !previous ||
          previous.senderUserId !== message.senderUserId ||
          previous.messageType === "SYSTEM" ||
          message.messageType === "SYSTEM",
        isGroupEnd:
          !next ||
          next.senderUserId !== message.senderUserId ||
          next.messageType === "SYSTEM" ||
          message.messageType === "SYSTEM",
      };
    });
  }, [ordered]);

  useEffect(() => {
    if (!endRef.current) return;
    endRef.current.scrollIntoView?.({ block: "end" });
  }, [conversationId, ordered.length]);

  const counterpartName = useMemo(() => {
    const fallbackName =
      scope === "patient"
        ? (session?.practitioner.displayName ?? null)
        : (session?.patient?.displayName ?? null);
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
      ? (session?.practitioner.displayName ?? null)
      : (session?.patient?.displayName ?? null);

  const backHref =
    scope === "patient" ? "/patient/sessions" : "/practitioner/sessions";
  const sessionDetailsHref =
    scope === "patient"
      ? (`/patient/sessions/${sessionId}` as never)
      : (`/practitioner/sessions/${sessionId}` as never);
  const showComposer =
    Boolean(conversationId) &&
    sessionChatAvailability?.canSend === true &&
    sessionChatAvailability?.readOnly !== true;
  const showAvailabilityLoading =
    sessionChatAvailability == null ||
    sessionConversationQuery.isLoading;
  const showReadOnlyNotice =
    !showAvailabilityLoading &&
    (sessionChatAvailability?.canSend !== true ||
      sessionChatAvailability?.readOnly === true);
  const readOnlyNotice =
    sessionChatAvailability?.reason === "SESSION_NOT_STARTED"
      ? locale === "ar"
        ? "المحادثة متاحة للقراءة فقط حاليًا. سيصبح إرسال الرسائل متاحًا عند بدء نافذة المحادثة."
        : "This conversation is currently read-only. Messaging will become available when the session chat opens."
      : locale === "ar"
        ? "انتهت إمكانية إرسال رسائل لهذه الجلسة. يمكنك مراجعة المحادثة السابقة."
        : "Messaging for this session has ended. You can still review the previous conversation.";

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

  const handleSendEmbedded = async () => {
    if (!conversationId) return;

    const content = message.trim();
    if (content.length === 0) return;

    try {
      setIsSending(true);
      realtimeThread.reportTypingActivity(false);
      await realtimeThread.sendMessage({
        message: content,
      });
      setMessage("");
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
              className="border-border-light text-text-secondary hover:bg-surface-tertiary inline-flex items-center justify-center rounded-2xl border px-5 py-2 text-sm dark:hover:bg-white/5"
            >
              {t("detail.chat.states.notAvailable.backToSession")}
            </Link>
          ),
        }}
      />
    );
  }

  const myUserId = meQuery.data?.userId ?? null;

  if (variant === "embedded") {
    const counterpartNameForHeader =
      counterpartName || t("detail.chat.fallbackName");
    return (
      <ChatConversationPanel
        header={
          <ChatConversationHeader
            title={counterpartNameForHeader}
            subtitle={
              <div className="mt-0.5 flex flex-col gap-1">
                <p className="text-text-muted text-xs font-medium dark:text-slate-400">
                  {getConversationSubtitle(conversationIdentity, myUserId) ||
                    sessionTitle}
                </p>
                <SessionCodeReference
                  sessionId={sessionId}
                  sessionCode={session?.sessionCode}
                  showLabel
                />
                {session?.scheduledStartAt && (
                  <p className="text-text-muted font-mono text-[10px] font-semibold tracking-wide opacity-75">
                    {locale.startsWith("ar") ? "الموعد: " : "Scheduled: "}
                    {formatEffectiveViewerTime(
                      session.scheduledStartAt,
                      viewerTimeZone,
                      { locale },
                    )}
                  </p>
                )}
              </div>
            }
            avatarUrl={getParticipantAvatarUrl(
              getConversationPrimaryParticipant(conversationIdentity, myUserId),
            )}
            online={false}
            actions={
              <div className="flex items-center gap-2">
                <ChatModerationReportAction
                  targetType="GENERAL_CHAT_CONVERSATION"
                  targetId={conversationId}
                />
                <span className="rounded-full border border-teal-100/30 bg-teal-50/70 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
                  {session?.operational?.state?.replaceAll("_", " ") ?? ""}
                </span>
              </div>
            }
          />
        }
        composer={
          showAvailabilityLoading ? (
            <div className="text-text-secondary shrink-0 border-t border-slate-100 bg-slate-50 p-4 text-xs leading-5 font-semibold dark:border-white/10 dark:bg-slate-900">
              <p className="text-text-primary dark:text-white/90">
                {t("detail.chat.states.availabilityLoading.heading")}
              </p>
            </div>
          ) : showReadOnlyNotice ? (
            <div className="text-text-secondary shrink-0 border-t border-slate-100 bg-slate-50 p-4 text-xs leading-5 font-medium dark:border-white/10 dark:bg-slate-900">
              <p className="text-text-primary font-bold dark:text-white/90">
                {readOnlyNotice}
              </p>
            </div>
          ) : showComposer ? (
            <ChatComposer
              placeholder={t("detail.chat.compose.placeholder")}
              value={message}
              onChange={(next) => {
                setMessage(next);
                realtimeThread.reportTypingActivity(next.trim().length > 0);
              }}
              onSubmit={handleSendEmbedded}
              isSubmitting={isSending || sendMutation.isPending}
              disabled={!conversationId || isSending}
            />
          ) : null
        }
      >
        {sessionConversationQuery.isError || messagesQuery.isError ? (
          <div className="p-4 text-center">
            <p className="mb-2 text-xs text-rose-500">
              {sessionConversationQuery.isError
                ? openErrorTitle
                : t("detail.chat.states.messagesError.heading")}
            </p>
            {!isForbidden && (
              <p className="text-text-secondary text-xs">
                {sessionConversationQuery.isError
                  ? openErrorNote
                  : t("detail.chat.states.messagesError.note")}
              </p>
            )}
          </div>
        ) : sessionConversationQuery.isLoading || messagesQuery.isLoading ? (
          <div className="text-text-muted flex animate-pulse items-center justify-center p-8 text-xs font-semibold">
            {locale === "ar" ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : !conversationId ? (
          <div className="text-text-muted p-8 text-center text-xs font-medium">
            {locale === "ar"
              ? "لا توجد رسائل سابقة لهذه الجلسة."
              : "No previous messages for this session."}
          </div>
        ) : ordered.length === 0 ? (
          <div className="text-text-muted p-8 text-center text-xs font-medium">
            {t("detail.chat.states.empty.heading")}
          </div>
        ) : (
          ordered.map((entry) => {
            const fromMe = Boolean(myUserId && entry.senderUserId === myUserId);
            return (
              <ChatMessageBubble
                key={entry.messageId}
                onReport={
                  <ChatModerationReportAction
                    compact
                    targetType="GENERAL_CHAT_MESSAGE"
                    targetId={entry.messageId}
                  />
                }
                message={{
                  id: entry.messageId,
                  body: entry.contentText || "",
                  sentAt: formatEffectiveViewerTime(
                    entry.sentAt,
                    viewerTimeZone,
                    { locale },
                  ),
                  direction: fromMe ? "outgoing" : "incoming",
                  status: (fromMe ? entry.localStatus : undefined) as any,
                }}
              />
            );
          })
        )}
        {realtimeThread.isPeerTyping && (
          <div className="mt-2 flex justify-start">
            <div className="border-border-light bg-surface-secondary text-text-muted inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] dark:border-white/10 dark:bg-white/10 dark:text-white/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </ChatConversationPanel>
    );
  }

  return (
    <FullHeightMessagesPage className="mx-auto flex max-w-3xl flex-col gap-3">
      <section className="app-panel rounded-[24px] p-3 sm:p-4">
        <Link
          href={backHref as never}
          className="text-primary mb-2 inline-flex items-center gap-2 text-xs font-semibold hover:underline"
        >
          <DirectionalArrowIcon direction="back" className="h-4 w-4" />
          {t("detail.chat.back")}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary-light text-primary ring-primary/15 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1">
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
              <h1 className="text-text-primary truncate text-lg font-semibold tracking-tight sm:text-xl dark:text-white/95">
                {counterpartName ?? t("detail.chat.fallbackName")}
              </h1>
              <p className="text-text-secondary mt-1 truncate text-xs leading-5">
                {getConversationSubtitle(
                  conversationIdentity,
                  meQuery.data?.userId ?? null,
                ) ?? sessionTitle}
              </p>
              <p className="text-text-secondary mt-1 text-xs leading-5">
                {t("detail.chat.note")}
              </p>
            </div>
          </div>

          {scope === "practitioner" ? (
            <button
              type="button"
              disabled={!conversationId || closeMutation.isPending}
              onClick={() => closeMutation.mutateAsync().catch(() => {})}
              className="border-border-light text-text-primary hover:border-danger-500/40 hover:text-danger-600 inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/90"
            >
              {closeMutation.isPending
                ? t("detail.chat.actions.closing")
                : t("detail.chat.actions.close")}
            </button>
          ) : null}
          <ChatModerationReportAction
            targetType="GENERAL_CHAT_CONVERSATION"
            targetId={conversationId}
          />
        </div>
      </section>

      <section className="app-panel flex min-h-0 flex-1 flex-col rounded-[24px] p-0">
        <div className="border-border-light border-b px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-text-primary text-sm font-semibold dark:text-white/95">
              {t("detail.chat.thread.heading")}
            </h2>
            {messagesQuery.isFetching ? (
              <span className="text-text-muted inline-flex items-center gap-2 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("detail.chat.thread.refreshing")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
          {sessionConversationQuery.isError ? (
            <StateCard
              title={openErrorTitle}
              note={openErrorNote}
              action={
                isForbidden
                  ? undefined
                  : {
                      label: t("detail.chat.states.openError.retry"),
                      onClick: () => sessionConversationQuery.refetch(),
                    }
              }
              centered={false}
              className="rounded-[24px] p-5"
            />
          ) : sessionConversationQuery.isLoading || messagesQuery.isLoading ? (
            <ListStateSkeleton items={6} heightClass="h-20" />
          ) : !conversationId ? (
            <StateCard
              title={
                locale === "ar"
                  ? "لا توجد رسائل سابقة لهذه الجلسة."
                  : "No previous messages for this session."
              }
              note={
                locale === "ar"
                  ? "يمكنك مراجعة المحادثة هنا عند توفر رسائل."
                  : "Historical messages will appear here when available."
              }
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
              const fromMe = Boolean(
                myUserId && entry.senderUserId === myUserId,
              );
              const senderIdentity =
                entry.senderIdentity ??
                getMessageSenderIdentity(entry, conversationIdentity);
              const senderParticipant: {
                identity: GeneralChatParticipantIdentity | null;
              } | null = senderIdentity
                ? "identity" in senderIdentity
                  ? senderIdentity
                  : { identity: senderIdentity }
                : null;
              const senderName = fromMe
                ? t("detail.chat.you")
                : getParticipantDisplayName(
                    senderParticipant,
                    t("detail.chat.fallbackName"),
                  );
              const senderSubtitle = fromMe
                ? t("detail.chat.youSubtitle")
                : getParticipantSubtitle(senderParticipant, null);
              const senderAvatarUrl = fromMe
                ? null
                : getParticipantAvatarUrl(senderParticipant);

              return (
                <div
                  key={entry.messageId}
                  className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[92%] flex-col ${fromMe ? "items-end" : "items-start"}`}
                  >
                    {isGroupStart ? (
                      <div
                        className={`mb-1 flex items-center gap-2 ${fromMe ? "flex-row-reverse" : ""}`}
                      >
                        <div className="bg-primary-light text-primary ring-primary/15 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1">
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
                        <div
                          className={`min-w-0 ${fromMe ? "text-end" : "text-start"}`}
                        >
                          <p className="text-text-primary truncate text-[11px] font-semibold dark:text-white/90">
                            {senderName}
                          </p>
                          {senderSubtitle ? (
                            <p className="text-text-muted truncate text-[10px] dark:text-white/55">
                              {senderSubtitle}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div
                      className={`max-w-full rounded-[14px] border px-2.5 py-1.5 ${
                        fromMe
                          ? "border-primary/45 from-primary to-primary-active bg-gradient-to-br text-white shadow-[0_14px_26px_-18px_rgba(68,161,148,0.7)]"
                          : "border-border-light/80 text-text-primary bg-white shadow-[0_8px_18px_-16px_rgba(34,52,56,0.2)] dark:border-white/10 dark:bg-white/10 dark:text-white/90"
                      }`}
                    >
                      {entry.contentText ? (
                        <p className="text-xs leading-4.5 tracking-[0.01em] break-words">
                          {entry.contentText}
                        </p>
                      ) : null}

                      {entry.attachments.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {entry.attachments.map((att) => (
                            <button
                              key={att.fileId}
                              type="button"
                              onClick={() =>
                                handleOpenAttachment(att.fileUrl).catch(
                                  () => {},
                                )
                              }
                              className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-xs font-medium transition ${
                                fromMe
                                  ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                                  : "border-border-light text-text-primary hover:border-primary/30 bg-white dark:bg-white/5 dark:text-white/90"
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
                          <CheckCheck className="text-primary-light me-1 h-3 w-3" />
                        ) : null}
                        {formatEffectiveViewerTime(
                          entry.sentAt,
                          viewerTimeZone,
                          { locale },
                        )}
                      </p>
                      <ChatModerationReportAction
                        compact
                        targetType="GENERAL_CHAT_MESSAGE"
                        targetId={entry.messageId}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {realtimeThread.isPeerTyping ? (
            <div className="flex justify-start">
              <div className="border-border-light bg-surface-secondary text-text-muted inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="border-border-light shrink-0 border-t px-3 py-3 sm:px-4">
          {showAvailabilityLoading ? (
            <div className="border-border-light bg-surface-tertiary text-text-secondary rounded-2xl border px-4 py-3 text-xs leading-6 dark:bg-white/5">
              <p className="text-text-primary font-semibold dark:text-white/90">
                {t("detail.chat.states.availabilityLoading.heading")}
              </p>
              <p className="mt-1">
                {t("detail.chat.states.availabilityLoading.note")}
              </p>
            </div>
          ) : showReadOnlyNotice ? (
            <div className="border-border-light bg-surface-tertiary text-text-secondary rounded-2xl border px-4 py-3 text-xs leading-6 dark:bg-white/5">
              <p className="text-text-primary font-semibold dark:text-white/90">
                {readOnlyNotice}
              </p>
            </div>
          ) : showComposer ? (
            <form onSubmit={handleSend} className="space-y-2">
              {attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <span
                      key={att.fileId}
                      className="border-border-light text-text-primary inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium dark:bg-white/5 dark:text-white/90"
                    >
                      <span className="break-words">
                        {att.originalName ?? att.mimeType}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.fileId)}
                        className="border-border-light text-text-muted hover:text-danger-600 inline-flex h-5 w-5 items-center justify-center rounded-full border transition"
                        aria-label={t("detail.chat.actions.removeAttachment")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex items-end gap-2">
                <label className="sr-only">
                  {t("detail.chat.compose.label")}
                </label>
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
                  className="app-control border-border-strong focus:border-primary focus:ring-primary/20 max-h-20 min-h-9 flex-1 resize-none rounded-md bg-white px-2 py-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_14px_-14px_rgba(68,161,148,0.35)] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/8 dark:text-white"
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
                  className="border-border-light text-text-secondary hover:border-primary/35 hover:text-primary inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/12 dark:bg-white/5 dark:text-white/75"
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
                  disabled={
                    message.trim().length === 0 ||
                    isSending ||
                    closeMutation.isPending
                  }
                  className="from-primary to-primary-active inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-gradient-to-br px-3 text-xs font-semibold text-white shadow-[0_10px_18px_-10px_rgba(68,161,148,0.78)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
