"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Loader2,
  SendHorizontal,
  Paperclip,
} from "lucide-react";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { useMySettings } from "@/features/settings/hooks/use-settings";
import { formatEffectiveViewerTime } from "@/lib/time-formatting";
import { useUnifiedMessages } from "@/features/chat/hooks/use-unified-messages";
import type { CanonicalConversation } from "@/features/messages-shell/types/messages-shell.types";
import { useAuthState } from "@/stores";
import ChatModerationReportAction from "@/features/moderation/components/ChatModerationReportAction";

interface Props {
  conversation: CanonicalConversation | null;
  role: "patient" | "practitioner" | "admin";
  locale: string;
  onOpenFullChat?: () => void;
  onNewSupportClick?: () => void;
  isVisible?: boolean;
}

export default function UnifiedConversationThread({
  conversation,
  role,
  locale,
  onOpenFullChat,
  onNewSupportClick,
  isVisible = true,
}: Props) {
  const { user: authUser } = useAuthState();
  const meQuery = useCurrentUser(true);
  const patientProfileQuery = usePatientProfile(role === "patient");
  const practitionerProfileQuery = usePractitionerProfile(
    role === "practitioner",
  );
  const settingsQuery = useMySettings(role === "admin");
  const viewerTimeZone =
    role === "patient"
      ? patientProfileQuery.data?.profile.timezone
      : role === "practitioner"
        ? practitionerProfileQuery.data?.profile.timezone
        : settingsQuery.data?.item.preferences.timezone;
  const myUserId = authUser?.id ?? meQuery.data?.userId ?? null;
  const conversationId = conversation?.conversationId ?? null;

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(
    null,
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const [typingActive, setTypingActive] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    messages,
    isLoading,
    isOffline,
    isTyping,
    loadMore,
    hasMore,
    isLoadingMore,
    sendMessage,
    retryMessage,
    markRead,
    canAcknowledgeRead,
    sendTypingNotification,
  } = useUnifiedMessages({
    conversationId,
    currentUserId: myUserId,
    currentUserRole:
      role === "patient"
        ? "Patient"
        : role === "practitioner"
          ? "Practitioner"
          : "Admin",
    isThreadVisible: isVisible,
  });

  const endRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [messages.length]);

  // Mark conversation as read when messages load or active message changes
  useEffect(() => {
    if (canAcknowledgeRead && conversationId && messages.length > 0) {
      // Find the latest visible incoming message (sender.userId !== myUserId)
      const latestIncomingMessage = [...messages]
        .reverse()
        .find((msg) => msg.sender.userId !== myUserId);
      if (latestIncomingMessage) {
        void markRead(latestIncomingMessage.id);
      }
    }
  }, [canAcknowledgeRead, conversationId, messages, myUserId, markRead]);

  // Typing start/stop handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (!typingActive) {
      setTypingActive(true);
      sendTypingNotification(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTypingActive(false);
      sendTypingNotification(false);
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation?.canSend || isSending || !message.trim()) return;

    try {
      setIsSending(true);
      setSendError(null);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTypingActive(false);
      sendTypingNotification(false);

      await sendMessage(message.trim());
      setMessage("");
    } catch {
      setSendError(
        locale.startsWith("ar")
          ? "\u062a\u0639\u0630\u0631 \u0627\u0644\u0625\u0631\u0633\u0627\u0644"
          : "Message not sent",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryMessage = async (clientMessageId: string) => {
    if (retryingMessageId || isOffline || isSending) return;
    setRetryingMessageId(clientMessageId);
    setSendError(null);
    try {
      await retryMessage(clientMessageId);
    } catch {
      setSendError(
        locale.startsWith("ar")
          ? "\u062a\u0639\u0630\u0631 \u0627\u0644\u0625\u0631\u0633\u0627\u0644"
          : "Message not sent",
      );
    } finally {
      setRetryingMessageId(null);
    }
  };

  const isArabic = locale.startsWith("ar");
  const messageNotSentLabel = isArabic
    ? "\u062a\u0639\u0630\u0631 \u0627\u0644\u0625\u0631\u0633\u0627\u0644"
    : "Message not sent";
  const retryLabel = isArabic
    ? "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629"
    : "Retry";
  const sendingLabel = isArabic
    ? "\u062c\u0627\u0631\u064d \u0627\u0644\u0625\u0631\u0633\u0627\u0644"
    : "Sending";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(e);
    }
  };

  // Get localized readonly copy
  const readonlyCopy = useMemo(() => {
    const isAr = locale.startsWith("ar");
    if (conversation?.type === "SESSION") {
      return isAr
        ? "انتهت إمكانية إرسال الرسائل في هذه الجلسة. يمكنك مراجعة المحادثة السابقة."
        : "Message sending is no longer available in this session. You can review the previous conversation.";
    }
    if (conversation?.type === "CARE") {
      return isAr
        ? "انتهت فترة المتابعة. يمكنك مراجعة الرسائل السابقة أو تقديم طلب متابعة جديد."
        : "Your follow-up window has expired. You can review previous messages or submit a new care request.";
    }
    if (conversation?.type === "SUPPORT") {
      return isAr
        ? "تم حل طلب الدعم وإغلاق هذه المحادثة. يمكنك مراجعة الرسائل السابقة."
        : "This support request has been resolved and closed. You can review the previous messages.";
    }
    return isAr
      ? "هذه المحادثة للقراءة فقط حالياً."
      : "This conversation is currently read-only.";
  }, [conversation?.type, locale]);

  if (!conversationId || !conversation) {
    return (
      <div className="text-text-muted flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm font-semibold">
          {locale.startsWith("ar")
            ? "اختر محادثة لبدء القراءة"
            : "Select a conversation to start reading"}
        </p>
      </div>
    );
  }

  return (
    <div className="border-border-light/80 flex h-full min-h-0 flex-col rounded-2xl border bg-white p-3 shadow-xs dark:border-white/10 dark:bg-slate-900/40">
      {/* Header */}
      <div className="border-border-light/70 mb-2 flex items-center justify-between gap-2 border-b pb-2.5 dark:border-white/10">
        <div className="min-w-0">
          <p className="text-text-primary truncate text-sm font-bold dark:text-white/95">
            {conversation.title}
          </p>
          <p className="text-text-secondary truncate text-xs dark:text-white/65">
            {conversation.subject || conversation.contextLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {(conversation.type === "SESSION" ||
            conversation.type === "CARE") && (
            <ChatModerationReportAction
              targetType="GENERAL_CHAT_CONVERSATION"
              targetId={conversationId}
            />
          )}
          {onOpenFullChat && (
            <button
              onClick={onOpenFullChat}
              className="px-2.5 py-1 text-xs font-bold text-primary hover:underline dark:text-primary-light"
            >
              {locale.startsWith("ar")
                ? "عرض المحادثة الكاملة"
                : "Open Full Chat"}
            </button>
          )}
        </div>
      </div>

      {/* Connection Banner */}
      {isOffline && (
        <div className="mb-2 rounded-xl bg-amber-500/10 px-3 py-1.5 text-center text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          {locale.startsWith("ar")
            ? "تم قطع الاتصال. جاري إعادة المحاولة..."
            : "Connection lost. Reconnecting..."}
        </div>
      )}

      {/* Message Timeline */}
      <div
        dir="ltr"
        className="custom-scrollbar border-border-light/60 min-h-0 flex-1 space-y-2.5 overflow-y-auto rounded-xl border bg-surface-secondary/40 p-3 shadow-2xs dark:border-white/10 dark:bg-slate-950/40"
      >
        {isLoading ? (
          <div className="text-text-muted flex animate-pulse items-center justify-center p-8 text-xs font-bold">
            {locale.startsWith("ar") ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="w-full py-1 text-center text-xs font-bold text-primary hover:underline disabled:opacity-50 dark:text-primary-light"
              >
                {isLoadingMore
                  ? locale.startsWith("ar")
                    ? "جاري تحميل المزيد..."
                    : "Loading more..."
                  : locale.startsWith("ar")
                    ? "تحميل الرسائل السابقة"
                    : "Load previous messages"}
              </button>
            )}

            {messages.length === 0 ? (
              <div className="text-text-muted py-8 text-center text-xs font-medium">
                {locale.startsWith("ar")
                  ? "لا توجد رسائل بعد."
                  : "No messages yet."}
              </div>
            ) : (
              messages.map((msg) => {
                const isMe =
                  msg.sender.userId === myUserId ||
                  (role === "admin" &&
                    (msg.sender.publicRoleLabel === "Support team" ||
                      msg.sender.publicRoleLabel === "Admin")) ||
                  (role === "patient" &&
                    msg.sender.publicRoleLabel === "Patient") ||
                  (role === "practitioner" &&
                    msg.sender.publicRoleLabel === "Practitioner");
                const isMessageSending = msg.deliveryState === "sending";
                const isMessageFailed = msg.deliveryState === "failed";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    dir="ltr"
                  >
                    <div
                      className={`text-text-muted mb-0.5 flex items-center gap-1.5 text-[11px] ${
                        isMe ? "flex-row-reverse" : "flex-row"
                      }`}
                      dir="ltr"
                    >
                      <span className="text-text-primary font-bold dark:text-white/85">
                        {msg.sender.displayName}
                      </span>
                      {msg.sender.publicRoleLabel &&
                        msg.sender.publicRoleLabel !== "System" && (
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.2 text-[9px] font-bold dark:bg-white/10 dark:text-white/60">
                            {locale.startsWith("ar") &&
                            msg.sender.publicRoleLabel === "Support team"
                              ? "فريق الدعم"
                              : msg.sender.publicRoleLabel}
                          </span>
                        )}
                    </div>
                    <div
                      className={`flex max-w-[70%] sm:max-w-[56%] items-end gap-1.5 ${
                        isMe ? "flex-row-reverse" : "flex-row"
                      }`}
                      dir="ltr"
                    >
                      {isMe ? null : (
                        <span className="from-primary/20 to-primary/10 text-primary ring-primary/20 dark:text-primary-light relative flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-extrabold ring-1 shadow-2xs">
                          {msg.sender.displayName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-1.5 text-xs leading-normal shadow-2xs transition ${
                          isMe
                            ? "bg-primary text-white rounded-te-xs shadow-xs"
                            : "text-text-primary border-border-light/80 rounded-ts-xs border bg-white dark:border-white/10 dark:bg-slate-800 dark:text-white/95"
                        } ${isMessageFailed ? "ring-1 ring-rose-400/70" : ""}`}
                      >
                        <p
                          dir="auto"
                          className="text-start break-words whitespace-pre-wrap"
                        >
                          {msg.body}
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75 select-none">
                          <span>
                            {formatEffectiveViewerTime(
                              msg.sentAt,
                              viewerTimeZone,
                              { locale },
                            )}
                          </span>
                          {(conversation.type === "SESSION" ||
                            conversation.type === "CARE") && (
                            <span className="ms-1 inline-flex">
                              <ChatModerationReportAction
                                compact
                                targetType="GENERAL_CHAT_MESSAGE"
                                targetId={msg.id}
                              />
                            </span>
                          )}
                          {isMe && isMessageSending ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>{sendingLabel}</span>
                            </>
                          ) : isMe && isMessageFailed ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              <span>{messageNotSentLabel}</span>
                            </>
                          ) : isMe ? (
                            msg.readAt ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {isMe &&
                    isMessageFailed &&
                    msg.clientMessageId &&
                    msg.deliveryErrorCode !== "MESSAGE_IDEMPOTENCY_CONFLICT" ? (
                      <button
                        type="button"
                        disabled={
                          Boolean(retryingMessageId) || isOffline || isSending
                        }
                        onClick={() =>
                          void handleRetryMessage(msg.clientMessageId!)
                        }
                        className="mt-1 text-[11px] font-semibold text-amber-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300"
                        aria-label={retryLabel}
                      >
                        {retryingMessageId === msg.clientMessageId
                          ? sendingLabel
                          : retryLabel}
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </>
        )}
      </div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="text-text-muted animate-pulse px-3 py-1 text-xs font-semibold">
          {locale.startsWith("ar") ? "جاري الكتابة..." : "Typing..."}
        </div>
      )}

      {/* Footer Area */}
      {conversation.canSend ? (
        <form
          onSubmit={handleSend}
          className="relative mt-2.5 flex items-center gap-2"
        >
          {sendError && (
            <div className="absolute start-0 end-0 mb-2 -translate-y-full rounded-xl bg-rose-500/10 px-3 py-2 text-center text-xs font-semibold text-rose-700 shadow-xs dark:text-rose-300">
              {sendError}
            </div>
          )}
          <div className="border-border-light/90 relative flex flex-1 items-center gap-1.5 rounded-2xl border bg-white p-1.5 shadow-xs transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 dark:border-white/12 dark:bg-white/5">
            {/* Attachment paperclip button */}
            <button
              type="button"
              disabled
              title={
                locale.startsWith("ar")
                  ? "إرسال الملفات والصور سيتوفر قريبًا"
                  : "File and image sharing will be available soon."
              }
              aria-label={
                locale.startsWith("ar")
                  ? "إرسال المرفقات (ستتوفر قريباً)"
                  : "Attachments (coming soon)"
              }
              className="inline-flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-xl text-slate-400 opacity-50 transition hover:bg-slate-100 focus:outline-none dark:text-slate-500 dark:hover:bg-white/10"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                locale.startsWith("ar") ? "اكتب رسالة..." : "Type a message..."
              }
              aria-label={
                locale.startsWith("ar")
                  ? "حقل كتابة الرسالة"
                  : "Message composer input"
              }
              className="custom-scrollbar text-text-primary block max-h-[100px] min-h-[36px] flex-1 resize-none bg-transparent py-2 px-1 text-xs outline-none focus:ring-0 dark:text-white dark:placeholder-white/45"
              rows={1}
            />
            <button
              type="submit"
              disabled={isSending || !message.trim() || isOffline}
              aria-label={
                locale.startsWith("ar") ? "إرسال الرسالة" : "Send message"
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs transition-all hover:bg-primary-hover focus:ring-2 focus:ring-primary/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal
                  className={`h-4 w-4 ${locale.startsWith("ar") ? "" : "rotate-180"}`}
                />
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-2.5 rounded-xl bg-slate-100 p-3 text-center dark:bg-white/5">
          <p className="text-text-secondary text-xs dark:text-white/70">
            {readonlyCopy}
          </p>
          {conversation.isResolved && onNewSupportClick && (
            <button
              type="button"
              onClick={onNewSupportClick}
              className="mt-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-hover shadow-xs"
            >
              {locale.startsWith("ar")
                ? "بدء طلب دعم جديد"
                : "Start New Support Ticket"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
