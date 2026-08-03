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
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import {
  formatEffectiveViewerDateTime,
  formatEffectiveViewerTime,
} from "@/lib/time-formatting";

type PractitionerSupportTicketScreenProps = {
  ticketId: string;
};

function formatTime(
  iso: string | null,
  locale: string,
  timeZone?: string | null,
) {
  if (!iso) return "";
  return formatEffectiveViewerTime(iso, timeZone, { locale });
}

function formatDateTime(
  value: string | null,
  locale: string,
  timeZone?: string | null,
) {
  if (!value) return "-";
  return formatEffectiveViewerDateTime(value, timeZone, { locale });
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
  const practitionerProfileQuery = usePractitionerProfile();
  const viewerTimeZone = practitionerProfileQuery.data?.profile.timezone;
  const reply = useAddPractitionerSupportMessage(ticketId);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const meQuery = useCurrentUser(true);

  // Clear draft text whenever switching tickets
  useEffect(() => {
    // Clear the composer when the selected ticket changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        localStatus: mine ? entry.localStatus || entry.status : undefined,
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
      <div className="flex h-full min-h-[500px] items-center justify-center rounded-3xl border border-slate-200/70 bg-[#f8fafc] p-6 shadow-sm dark:border-white/5 dark:bg-slate-950/10">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (ticket.isError || !ticket.data) {
    return (
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white p-6 text-center shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
        <p className="mb-2 text-sm font-semibold text-rose-500">
          {t("states.detailError.heading")}
        </p>
        <p className="text-text-secondary mb-4 text-xs">
          {t("states.detailError.note")}
        </p>
        <Link
          href="/practitioner/support"
          className="bg-primary hover:bg-primary-hover inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-white"
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
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
                  {t(`categories.${item.category}` as Parameters<typeof t>[0])}
                </span>
                <span className="text-text-secondary rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-white/10 dark:text-white">
                  {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    item.priority === "URGENT" || item.priority === "HIGH"
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                      : "text-text-secondary bg-slate-100 dark:bg-white/10 dark:text-white",
                  )}
                >
                  {t(`priorities.${item.priority}` as Parameters<typeof t>[0])}
                </span>
              </div>
              <p className="text-text-muted mt-0.5 text-[11px] font-medium">
                {locale === "ar"
                  ? `رقم التذكرة: ${item.id} • تم الإنشاء: ${formatDateTime(item.createdAt, locale, viewerTimeZone)}`
                  : `Ticket ID: ${item.id} • Created: ${formatDateTime(item.createdAt, locale, viewerTimeZone)}`}
              </p>
            </div>
          }
          online={false}
          actions={
            <Link
              href="/practitioner/support"
              className="flex items-center justify-center rounded-xl border border-slate-200/50 p-2.5 transition hover:bg-slate-50 lg:hidden dark:border-white/10 dark:hover:bg-white/5"
            >
              <DirectionalArrowIcon
                direction="back"
                className="text-text-primary h-4 w-4"
              />
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
          disabled={
            reply.isPending ||
            item.status === "CLOSED" ||
            item.status === "RESOLVED"
          }
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
              sentAt: formatTime(msg.createdAt, numLocale, viewerTimeZone),
              direction: msg.mine ? "outgoing" : "incoming",
              status: msg.localStatus as any,
            }}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-text-primary text-sm font-semibold dark:text-white/95">
            {t("thread.empty.heading")}
          </p>
          <p className="text-text-secondary mt-1 text-xs">
            {t("thread.empty.note")}
          </p>
        </div>
      )}
      {realtimeThread.isPeerTyping && (
        <div className="mt-2 flex justify-start">
          <div className="border-border-light/80 text-text-muted inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[11px] dark:border-white/10 dark:bg-white/10 dark:text-white/60">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
          </div>
        </div>
      )}
    </ChatConversationPanel>
  );
}
