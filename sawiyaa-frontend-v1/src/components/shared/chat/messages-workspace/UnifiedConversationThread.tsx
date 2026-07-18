"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCheck, Loader2, SendHorizontal, Paperclip } from "lucide-react";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { useUnifiedMessages } from "@/features/chat/hooks/use-unified-messages";
import type { CanonicalConversation } from "@/features/messages-shell/types/messages-shell.types";
import { useAuthState } from "@/stores";

interface Props {
  conversation: CanonicalConversation | null;
  role: "patient" | "practitioner" | "admin";
  locale: string;
  onOpenFullChat?: () => void;
  onNewSupportClick?: () => void;
}

function formatTime(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function UnifiedConversationThread({
  conversation,
  role,
  locale,
  onOpenFullChat,
  onNewSupportClick,
}: Props) {
  const { user: authUser } = useAuthState();
  const meQuery = useCurrentUser(true);
  const myUserId = authUser?.id ?? meQuery.data?.userId ?? null;
  const conversationId = conversation?.conversationId ?? null;

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
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
    sendTypingNotification,
  } = useUnifiedMessages({
    conversationId,
    currentUserId: myUserId,
    currentUserRole: role === "patient" ? "Patient" : role === "practitioner" ? "Practitioner" : "Admin",
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
    if (conversationId && messages.length > 0) {
      // Find the latest visible incoming message (sender.userId !== myUserId)
      const latestIncomingMessage = [...messages].reverse().find((msg) => msg.sender.userId !== myUserId);
      if (latestIncomingMessage) {
        void markRead(latestIncomingMessage.id);
      }
    }
  }, [conversationId, messages, myUserId, markRead]);

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
      setSendError(locale.startsWith("ar") ? "\u062a\u0639\u0630\u0631 \u0627\u0644\u0625\u0631\u0633\u0627\u0644" : "Message not sent");
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
      setSendError(locale.startsWith("ar") ? "\u062a\u0639\u0630\u0631 \u0627\u0644\u0625\u0631\u0633\u0627\u0644" : "Message not sent");
    } finally {
      setRetryingMessageId(null);
    }
  };

  const isArabic = locale.startsWith("ar");
  const messageNotSentLabel = isArabic ? "\u062a\u0639\u0630\u0631 \u0627\u0644\u0625\u0631\u0633\u0627\u0644" : "Message not sent";
  const retryLabel = isArabic ? "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629" : "Retry";
  const sendingLabel = isArabic ? "\u062c\u0627\u0631\u064d \u0627\u0644\u0625\u0631\u0633\u0627\u0644" : "Sending";

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
    return isAr ? "هذه المحادثة للقراءة فقط حالياً." : "This conversation is currently read-only.";
  }, [conversation?.type, locale]);

  if (!conversationId || !conversation) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-text-muted">
        <p className="text-sm font-semibold">
          {locale.startsWith("ar") ? "اختر محادثة لبدء القراءة" : "Select a conversation to start reading"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border-light/80 bg-gradient-to-b from-white to-primary-light/60 p-2 shadow-[0_16px_32px_-24px_rgba(68,161,148,0.38)] dark:border-white/10 dark:from-white/5 dark:to-white/3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-border-light/70 pb-2 dark:border-white/10">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
            {conversation.title}
          </p>
          <p className="truncate text-xs text-text-secondary dark:text-white/65">
            {conversation.subject || conversation.contextLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onOpenFullChat && (
            <button
              onClick={onOpenFullChat}
              className="px-2 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              {locale.startsWith("ar") ? "عرض المحادثة الكاملة" : "Open Full Chat"}
            </button>
          )}
        </div>
      </div>

      {/* Connection Banner */}
      {isOffline && (
        <div className="mb-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-center text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          {locale.startsWith("ar") ? "تم قطع الاتصال. جاري إعادة المحاولة..." : "Connection lost. Reconnecting..."}
        </div>
      )}

      {/* Message Timeline */}
      <div
        dir="ltr"
        className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-border-light/70 bg-gradient-to-b from-[#FBF9F5] to-[#F7F4EE] p-4 shadow-inner dark:border-white/10 dark:from-white/5 dark:to-white/3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-xs text-text-muted animate-pulse">
            {locale.startsWith("ar") ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="w-full text-center text-xs font-bold text-teal-600 hover:underline disabled:opacity-50 py-1"
              >
                {isLoadingMore
                  ? (locale.startsWith("ar") ? "جاري تحميل المزيد..." : "Loading more...")
                  : (locale.startsWith("ar") ? "تحميل الرسائل السابقة" : "Load previous messages")}
              </button>
            )}

            {messages.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                {locale.startsWith("ar") ? "لا توجد رسائل بعد." : "No messages yet."}
              </div>
            ) : (
              messages.map((msg) => {
                const isMe =
                  msg.sender.userId === myUserId ||
                  (role === "admin" && (msg.sender.publicRoleLabel === "Support team" || msg.sender.publicRoleLabel === "Admin")) ||
                  (role === "patient" && msg.sender.publicRoleLabel === "Patient") ||
                  (role === "practitioner" && msg.sender.publicRoleLabel === "Practitioner");
                const isMessageSending = msg.deliveryState === "sending";
                const isMessageFailed = msg.deliveryState === "failed";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    dir="ltr"
                  >
                    <div
                      className={`flex items-center gap-1.5 text-[12px] text-text-muted mb-1 ${
                        isMe ? "flex-row-reverse" : "flex-row"
                      }`}
                      dir="ltr"
                    >
                      <span className="font-semibold text-text-primary dark:text-white/85">
                        {msg.sender.displayName}
                      </span>
                      {msg.sender.publicRoleLabel && msg.sender.publicRoleLabel !== "System" && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary dark:bg-white/10 dark:text-white/60">
                          {locale.startsWith("ar") && msg.sender.publicRoleLabel === "Support team"
                            ? "فريق الدعم"
                            : msg.sender.publicRoleLabel}
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex items-end gap-2 max-w-[85%] ${
                        isMe ? "flex-row-reverse" : "flex-row"
                      }`}
                      dir="ltr"
                    >
                      {isMe ? null : (
                        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/12 to-primary/6 text-[12px] font-bold text-primary ring-1 ring-primary/25 dark:text-primary-light">
                          {msg.sender.displayName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm transition hover:shadow-md ${
                          isMe
                            ? "bg-primary text-white rounded-tr-none"
                            : "bg-white text-text-primary border border-border-light rounded-tl-none dark:bg-white/10 dark:text-white/95 dark:border-white/5"
                        } ${isMessageFailed ? "ring-1 ring-rose-400/70" : ""}`}
                      >
                        <p dir="auto" className="whitespace-pre-wrap break-words text-start">
                          {msg.body}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[11px] opacity-75 mt-1 select-none">
                          <span>{formatTime(msg.sentAt, locale)}</span>
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
                            msg.readAt ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {isMe && isMessageFailed && msg.clientMessageId && msg.deliveryErrorCode !== "MESSAGE_IDEMPOTENCY_CONFLICT" ? (
                      <button
                        type="button"
                        disabled={Boolean(retryingMessageId) || isOffline || isSending}
                        onClick={() => void handleRetryMessage(msg.clientMessageId!)}
                        className="mt-1 text-[11px] font-semibold text-amber-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300"
                        aria-label={retryLabel}
                      >
                        {retryingMessageId === msg.clientMessageId ? sendingLabel : retryLabel}
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
        <div className="px-3 py-1 text-xs text-text-muted animate-pulse">
          {locale.startsWith("ar") ? "جاري الكتابة..." : "Typing..."}
        </div>
      )}

      {/* Footer Area */}
      {conversation.canSend ? (
        <form onSubmit={handleSend} className="relative mt-2 flex items-end gap-2">
          {sendError && (
            <div className="absolute -translate-y-full start-0 end-0 mb-2 rounded-lg bg-rose-500/10 px-3 py-2 text-center text-xs font-semibold text-rose-700 dark:text-rose-300">
              {sendError}
            </div>
          )}
          <div className="relative flex-1 flex items-center rounded-xl border border-border-light bg-white dark:border-white/12 dark:bg-white/5">
            {/* Disabled paperclip button */}
            <button
              type="button"
              disabled
              title={locale.startsWith("ar") ? "إرسال الملفات والصور سيتوفر قريبًا" : "File and image sharing will be available soon."}
              aria-label={locale.startsWith("ar") ? "إرسال المرفقات (ستتوفر قريباً)" : "Attachments (coming soon)"}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 focus:outline-none"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>
            <textarea
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={locale.startsWith("ar") ? "اكتب رسالة..." : "Type a message..."}
              aria-label={locale.startsWith("ar") ? "حقل كتابة الرسالة" : "Message composer input"}
              className="custom-scrollbar block w-full resize-none bg-transparent py-2.5 pe-12 ps-1 text-sm text-text-primary outline-none focus:ring-0 dark:text-white dark:placeholder-white/45 min-h-[40px] max-h-[120px]"
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={isSending || !message.trim() || isOffline}
            aria-label={locale.startsWith("ar") ? "إرسال الرسالة" : "Send message"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white transition-all hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className={`h-4.5 w-4.5 ${locale.startsWith("ar") ? "" : "rotate-180"}`} />
            )}
          </button>
        </form>
      ) : (
        <div className="mt-2 rounded-xl bg-slate-100 p-3 text-center dark:bg-white/5">
          <p className="text-xs text-text-secondary dark:text-white/70">{readonlyCopy}</p>
          {conversation.isResolved && onNewSupportClick && (
            <button
              type="button"
              onClick={onNewSupportClick}
              className="mt-2 rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700"
            >
              {locale.startsWith("ar") ? "بدء طلب دعم جديد" : "Start New Support Ticket"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
