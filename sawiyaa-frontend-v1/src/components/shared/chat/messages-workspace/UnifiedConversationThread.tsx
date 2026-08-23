"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  SendHorizontal,
  Paperclip,
  Smile,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { usePatientProfile } from "@/features/patients/hooks/use-patients";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { useMySettings } from "@/features/settings/hooks/use-settings";
import { formatEffectiveViewerTime } from "@/lib/time-formatting";
import httpClient from "@/lib/api/http-client";
import { useUnifiedMessages } from "@/features/chat/hooks/use-unified-messages";
import type { MessageSendDescriptor } from "@/features/chat/lib/message-identity";
import {
  getChatAttachmentPolicy,
  uploadCanonicalChatAttachment,
  type ChatAttachmentUpload,
} from "@/features/messages-shell/api/messages-shell.api";
import {
  chatAttachmentError,
  formatChatAttachmentSize,
  isChatImage,
  validateChatAttachment,
} from "@/features/chat/lib/attachment-utils";
import type {
  CanonicalConversation,
  MessagingMessage,
} from "@/features/messages-shell/types/messages-shell.types";
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
  const [attachments, setAttachments] = useState<ChatAttachmentUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const attachmentPolicyQuery = useQuery({
    queryKey: ["chat-attachment-policy"],
    queryFn: getChatAttachmentPolicy,
    enabled: Boolean(conversationId),
    staleTime: 60_000,
  });
  const attachmentPolicy = attachmentPolicyQuery.data?.item ?? null;

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
    if (!conversation?.canSend || isSending || isUploading || (!message.trim() && attachments.length === 0)) return;

    try {
      setIsSending(true);
      setSendError(null);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTypingActive(false);
      sendTypingNotification(false);

      const messageAttachments: MessageSendDescriptor["attachments"] = attachments.map((attachment) => ({
        fileId: attachment.fileId,
        fileUrl: attachment.fileUrl,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        originalName: attachment.originalName ?? undefined,
      }));
      await sendMessage(message.trim(), messageAttachments);
      setMessage("");
      setAttachments([]);
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

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || !attachmentPolicy || !conversationId) return;
    const isArabic = locale.startsWith("ar");
    const selected = Array.from(files);
    let currentBytes = attachments.reduce((sum, item) => sum + item.fileSize, 0);
    for (const file of selected) {
      const validationError = validateChatAttachment(
        file,
        attachments.length,
        currentBytes,
        attachmentPolicy,
      );
      if (validationError) {
        setSendError(chatAttachmentError(validationError, isArabic));
        break;
      }
      try {
        setIsUploading(true);
        setSendError(null);
        const uploaded = await uploadCanonicalChatAttachment(conversationId, file);
        setAttachments((current) => [...current, uploaded.item]);
        currentBytes += uploaded.item.fileSize;
      } catch {
        setSendError(isArabic ? "تعذر رفع المرفق." : "The attachment could not be uploaded.");
        break;
      } finally {
        setIsUploading(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenAttachment = async (attachment: ChatAttachmentUpload | NonNullable<MessagingMessage["attachments"]>[number]) => {
    try {
      const objectUrl = URL.createObjectURL(await fetchAttachmentBlob(attachment.fileUrl));
      const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = attachment.originalName || "attachment";
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setSendError(locale.startsWith("ar") ? "تعذر فتح هذا المرفق." : "Could not open this attachment.");
    }
  };

  const handleDownloadAttachment = async (attachment: NonNullable<MessagingMessage["attachments"]>[number]) => {
    try {
      const objectUrl = URL.createObjectURL(await fetchAttachmentBlob(attachment.fileUrl));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.originalName || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setSendError(locale.startsWith("ar") ? "تعذر تنزيل هذا المرفق." : "Could not download this attachment.");
    }
  };

  const appendEmoji = (emoji: string) => {
    setMessage((current) => `${current}${emoji}`);
    setIsEmojiOpen(false);
  };

  const fetchAttachmentBlob = async (fileUrl: string) => {
    const path = fileUrl.startsWith("/api/v1/")
      ? fileUrl.slice("/api/v1".length)
      : fileUrl;
    const response = await httpClient.get(path, { responseType: "blob" });
    return response.data as Blob;
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
                        {msg.attachments?.length ? (
                          <div className="mt-2 space-y-1.5">
                            {msg.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 rounded-xl border border-current/15 bg-black/5 px-2.5 py-2"
                              >
                                {isChatImage(attachment.mimeType) ? (
                                  <ImageIcon className="h-4 w-4 shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[11px] font-semibold">
                                    {attachment.originalName || attachment.mimeType}
                                  </p>
                                  <p className="text-[10px] opacity-70">
                                    {attachment.mimeType} {formatChatAttachmentSize(attachment.fileSize) ? `• ${formatChatAttachmentSize(attachment.fileSize)}` : ""}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleOpenAttachment(attachment)}
                                  className="rounded-lg p-1.5 hover:bg-black/10"
                                  aria-label={isChatImage(attachment.mimeType) ? (isArabic ? "معاينة المرفق" : "Preview attachment") : (isArabic ? "فتح المرفق" : "Open attachment")}
                                  title={isChatImage(attachment.mimeType) ? (isArabic ? "معاينة" : "Preview") : (isArabic ? "فتح" : "Open")}
                                >
                                  <span className="text-[10px] font-bold">{isChatImage(attachment.mimeType) ? "◉" : "↗"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadAttachment(attachment)}
                                  className="rounded-lg p-1.5 hover:bg-black/10"
                                  aria-label={isArabic ? "تنزيل المرفق" : "Download attachment"}
                                  title={isArabic ? "تنزيل" : "Download"}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
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
          className="relative mt-2.5 flex flex-col items-stretch gap-2"
        >
          {sendError && (
            <div className="absolute start-0 end-0 mb-2 -translate-y-full rounded-xl bg-rose-500/10 px-3 py-2 text-center text-xs font-semibold text-rose-700 shadow-xs dark:text-rose-300">
              {sendError}
            </div>
          )}
          <div className="border-border-light/90 relative flex w-full items-center gap-1.5 rounded-2xl border bg-white p-1.5 shadow-xs transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 dark:border-white/12 dark:bg-white/5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept={attachmentPolicy ? [...attachmentPolicy.imageTypes, ...attachmentPolicy.documentTypes].join(",") : undefined}
              onChange={(event) => void handleFilesSelected(event.target.files)}
            />
            <button
              type="button"
              disabled={!attachmentPolicy?.enabled || isUploading || isSending}
              onClick={() => fileInputRef.current?.click()}
              title={locale.startsWith("ar") ? "إضافة مرفق" : "Add attachment"}
              aria-label={
                locale.startsWith("ar")
                  ? "إضافة مرفق"
                  : "Add attachment"
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none dark:text-slate-400 dark:hover:bg-white/10"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEmojiOpen((open) => !open)}
                disabled={isSending}
                aria-label={locale.startsWith("ar") ? "إضافة رمز تعبيري" : "Add emoji"}
                title={locale.startsWith("ar") ? "رموز تعبيرية" : "Emoji"}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <Smile className="h-4 w-4" />
              </button>
              {isEmojiOpen ? (
                <div className="absolute bottom-11 start-0 z-20 grid grid-cols-6 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-800">
                  {["😊", "😂", "👍", "❤️", "🙏", "🎉", "😅", "🤍", "👏", "✨", "🙂", "😢"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => appendEmoji(emoji)}
                      className="rounded-lg p-1.5 text-lg hover:bg-slate-100 dark:hover:bg-white/10"
                      aria-label={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
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
              disabled={isSending || isUploading || (!message.trim() && attachments.length === 0) || isOffline}
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
          {attachments.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {attachments.map((attachment) => (
                <span key={attachment.fileId} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] dark:border-white/10 dark:bg-white/5">
                  <span className="max-w-44 truncate">{attachment.originalName || attachment.mimeType} · {formatChatAttachmentSize(attachment.fileSize)}</span>
                  <button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.fileId !== attachment.fileId))} aria-label={isArabic ? "إزالة المرفق" : "Remove attachment"}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
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
