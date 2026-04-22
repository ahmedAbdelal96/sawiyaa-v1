"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LifeBuoy } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import FullHeightMessagesPage from "@/components/messages/FullHeightMessagesPage";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { useAddPatientSupportMessage, usePatientSupportTicket } from "../hooks/use-support";
import type { SupportTicketPriority, SupportTicketStatus } from "../types/support.types";
import { useCurrentUser } from "@/features/users/hooks/use-users";
import {
  useSupportChatRealtime,
  type SupportRealtimeMessage,
} from "@/features/support/hooks/use-support-chat-realtime";
import SupportThreadPanel, { type SupportThreadMessageVM } from "./shared/SupportThreadPanel";

type PatientSupportTicketScreenProps = {
  ticketId: string;
};

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function TicketStatusChip({ status }: { status: SupportTicketStatus }) {
  const t = useTranslations("support");
  return (
    <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
      {t(`statuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function TicketPriorityChip({ priority }: { priority: SupportTicketPriority }) {
  const t = useTranslations("support");
  return (
    <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
      {t(`priorities.${priority}` as Parameters<typeof t>[0])}
    </span>
  );
}

export default function PatientSupportTicketScreen({
  ticketId,
}: PatientSupportTicketScreenProps) {
  const t = useTranslations("support");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const ticket = usePatientSupportTicket(ticketId);
  const reply = useAddPatientSupportMessage(ticketId);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const meQuery = useCurrentUser(true);

  const realtimeThread = useSupportChatRealtime({
    ticketId,
    serverMessages: ticket.data?.item?.messages ?? [],
    currentUserId: meQuery.data?.userId ?? null,
    currentUserRole: "PATIENT",
    refetchTicket: () => ticket.refetch(),
    sendViaRest: (payload) => reply.mutateAsync(payload),
  });

  const messages = useMemo<SupportRealtimeMessage[]>(
    () => realtimeThread.messages,
    [realtimeThread.messages],
  );

  const threadMessages = useMemo<SupportThreadMessageVM[]>(() => {
    const myId = meQuery.data?.userId ?? null;
    return messages.map((entry) => {
      const mine = myId ? entry.senderUserId === myId : entry.senderRole === "PATIENT";
      return {
        id: entry.id,
        mine,
        message: entry.message,
        createdAt: entry.createdAt,
        localStatus: mine ? entry.localStatus : undefined,
      };
    });
  }, [messages, meQuery.data?.userId]);

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
      <div className="app-max-content mx-auto">
        <ListStateSkeleton items={2} heightClass="h-40" />
      </div>
    );
  }

  if (ticket.isError || !ticket.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          title={t("states.detailError.heading")}
          note={t("states.detailError.note")}
          action={{
            label: t("states.detailError.back"),
            href: (
              <Link
                href="/patient/support"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {t("states.detailError.back")}
              </Link>
            ),
          }}
          className="rounded-[28px] p-6 sm:p-8"
        />
      </div>
    );
  }

  const item = ticket.data.item;

  return (
    <FullHeightMessagesPage className="app-max-content mx-auto flex flex-col gap-4 sm:gap-5">
      <section className="app-panel rounded-[28px] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Link
              href="/patient/support"
              className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            >
              <DirectionalArrowIcon direction="back" className="h-4 w-4" />
              {t("detail.back")}
            </Link>
            <h1 className="text-lg font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-xl">
              {item.subject}
            </h1>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {item.description ?? t("detail.noDescription")}
            </p>
          </div>

          <div className="hidden rounded-2xl border border-border-light/70 bg-surface-secondary px-3 py-2 text-xs text-text-secondary lg:block dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            <div className="flex items-center gap-2 text-text-primary dark:text-white/90">
              <LifeBuoy className="h-4 w-4 text-primary" />
              <span className="font-medium">{t("detail.helperTitle")}</span>
            </div>
            <p className="mt-1 max-w-xs text-xs leading-5 text-text-muted dark:text-white/60">
              {t("detail.helperNote")}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {t(`categories.${item.category}` as Parameters<typeof t>[0])}
          </span>
          <TicketStatusChip status={item.status} />
          <TicketPriorityChip priority={item.priority} />
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-muted">
          <span>{t("detail.createdAt", { date: formatDateTime(item.createdAt, numLocale) })}</span>
          {item.lastMessageAt && (
            <span>{t("detail.lastReplyAt", { date: formatDateTime(item.lastMessageAt, numLocale) })}</span>
          )}
          {item.resolvedAt && (
            <span>{t("detail.resolvedAt", { date: formatDateTime(item.resolvedAt, numLocale) })}</span>
          )}
          {item.closedAt && (
            <span>{t("detail.closedAt", { date: formatDateTime(item.closedAt, numLocale) })}</span>
          )}
        </div>
      </section>

      <SupportThreadPanel
        locale={locale}
        title={t("thread.heading")}
        note={t("thread.note")}
        countLabel={t("thread.count", { value: threadMessages.length })}
        messages={threadMessages}
        isPeerTyping={realtimeThread.isPeerTyping}
        emptyHeading={t("thread.empty.heading")}
        emptyNote={t("thread.empty.note")}
        composer={{
          placeholder: t("reply.placeholder"),
          value: message,
          errorNote: reply.isError ? t("errors.generic") : null,
          onChange: (next) => {
            setMessage(next);
            realtimeThread.reportTypingActivity(next.trim().length > 0);
          },
          onSubmit: submitReply,
          isSubmitting: isSending || reply.isPending,
          disabled: reply.isPending,
          submitLabel: t("reply.submit"),
        }}
      />
    </FullHeightMessagesPage>
  );
}
