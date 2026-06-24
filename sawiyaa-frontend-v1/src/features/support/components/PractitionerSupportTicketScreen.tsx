"use client";

import { useMemo, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import {
  useAddPractitionerSupportMessage,
  usePractitionerSupportTicket,
} from "../hooks/use-support";
import type { SupportMessage } from "../types/support.types";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import { useSupportChatRealtime } from "@/features/support/hooks/use-support-chat-realtime";
import {
  ChatConversationPanel,
  ChatConversationHeader,
  ChatMessageBubble,
  ChatComposer,
} from "@/components/shared/chat/ChatKit";
import { cn } from "@/lib/utils";

type PractitionerSupportTicketScreenProps = {
  ticketId: string;
};

function formatTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function isMessageMine(message: SupportMessage, currentUserId?: string | null) {
  if (currentUserId && message.senderUserId === currentUserId) {
    return true;
  }
  return message.senderRole === "PRACTITIONER";
}

export default function PractitionerSupportTicketScreen({
  ticketId,
}: PractitionerSupportTicketScreenProps) {
  const t = useTranslations("support.practitioner");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const ticket = usePractitionerSupportTicket(ticketId);
  const reply = useAddPractitionerSupportMessage(ticketId);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const meQuery = useCurrentUser(true);

  // Clear draft text whenever switching tickets
  useEffect(() => {
    setMessage("");
  }, [ticketId]);

  const realtimeThread = useSupportChatRealtime({
    ticketId,
    serverMessages: ticket.data?.item?.messages ?? [],
    currentUserId: meQuery.data?.userId ?? null,
    currentUserRole: "PRACTITIONER",
    refetchTicket: () => ticket.refetch(),
    sendViaRest: (payload) => reply.mutateAsync(payload),
  });

  const threadMessages = useMemo(() => {
    const myId = meQuery.data?.userId ?? null;
    return realtimeThread.messages.map((entry) => {
      const mine = isMessageMine(entry, myId);
      return {
        id: entry.id,
        mine,
        message: entry.message,
        createdAt: entry.createdAt,
        localStatus: mine ? (entry.localStatus || entry.status) : undefined,
      };
    });
  }, [realtimeThread.messages, meQuery.data?.userId]);

  const submitReply = async () => {
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

  if (ticket.isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f8fafc] dark:bg-slate-950/10 border border-slate-200/70 dark:border-white/5 rounded-3xl p-6 shadow-sm min-h-[500px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (ticket.isError || !ticket.data) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 rounded-3xl p-6 shadow-sm text-center min-h-[500px]">
        <p className="text-sm font-semibold text-rose-500 mb-2">{t("states.detailError.heading")}</p>
        <p className="text-xs text-text-secondary mb-4">{t("states.detailError.note")}</p>
        <Link
          href="/practitioner/support"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
        >
          {t("states.detailError.back")}
        </Link>
      </div>
    );
  }

  const item = ticket.data.item;

  return (
    <ChatConversationPanel
      header={
        <ChatConversationHeader
          title={item.subject}
          subtitle={
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-400">
                  {t(`categories.${item.category}` as Parameters<typeof t>[0])}
                </span>
                <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold text-text-secondary dark:text-white">
                  {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
                </span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                  item.priority === "URGENT" || item.priority === "HIGH"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    : "bg-slate-100 text-text-secondary dark:bg-white/10 dark:text-white"
                )}>
                  {t(`priorities.${item.priority}` as Parameters<typeof t>[0])}
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5 font-medium">
                {locale === "ar"
                  ? `رقم التذكرة: ${item.id} • تم الإنشاء: ${formatDateTime(item.createdAt, locale)}`
                  : `Ticket ID: ${item.id} • Created: ${formatDateTime(item.createdAt, locale)}`}
              </p>
            </div>
          }
          online={false}
          actions={
            <Link
              href="/practitioner/support"
              className="lg:hidden p-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition flex items-center justify-center border border-slate-200/50 dark:border-white/10"
            >
              <DirectionalArrowIcon direction="back" className="h-4 w-4 text-text-primary" />
            </Link>
          }
        />
      }
      composer={
        <ChatComposer
          placeholder={t("reply.placeholder")}
          value={message}
          onChange={(next) => {
            setMessage(next);
            realtimeThread.reportTypingActivity(next.trim().length > 0);
          }}
          onSubmit={submitReply}
          isSubmitting={isSending || reply.isPending}
          disabled={reply.isPending || item.status === "CLOSED" || item.status === "RESOLVED"}
        />
      }
    >
      {threadMessages.length > 0 ? (
        threadMessages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={{
              id: msg.id,
              body: msg.message,
              sentAt: formatTime(msg.createdAt, numLocale),
              direction: msg.mine ? "outgoing" : "incoming",
              status: msg.localStatus as any,
            }}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("thread.empty.heading")}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {t("thread.empty.note")}
          </p>
        </div>
      )}
      {realtimeThread.isPeerTyping && (
        <div className="flex justify-start mt-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-border-light/80 bg-white px-2.5 py-1 text-[11px] text-text-muted dark:border-white/10 dark:bg-white/10 dark:text-white/60">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
          </div>
        </div>
      )}
    </ChatConversationPanel>
  );
}
