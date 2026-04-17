"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, LifeBuoy, Loader2, SendHorizonal } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  useAddPractitionerSupportMessage,
  usePractitionerSupportTicket,
} from "../hooks/use-support";
import type {
  SupportMessageSenderRole,
  SupportTicketPriority,
  SupportTicketStatus,
} from "../types/support.types";

type PractitionerSupportTicketScreenProps = {
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

function MessageBubble({
  senderRole,
  message,
  createdAt,
}: {
  senderRole: SupportMessageSenderRole;
  message: string;
  createdAt: string;
}) {
  const t = useTranslations("support.practitioner");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const fromUser = senderRole === "PRACTITIONER";

  return (
    <div className={`flex ${fromUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-[24px] px-4 py-3 sm:max-w-[78%] ${
          fromUser
            ? "bg-primary text-white"
            : "app-panel-soft text-text-primary dark:text-white/90"
        }`}
      >
        <p className={`text-xs font-semibold ${fromUser ? "text-white/80" : "text-primary"}`}>
          {t(`thread.senderRoles.${senderRole}` as Parameters<typeof t>[0])}
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            fromUser ? "text-white" : "text-text-primary dark:text-white/90"
          }`}
        >
          {message}
        </p>
        <p className={`mt-2 text-[11px] ${fromUser ? "text-white/75" : "text-text-muted"}`}>
          {formatDateTime(createdAt, numLocale)}
        </p>
      </div>
    </div>
  );
}

function TicketStatusChip({ status }: { status: SupportTicketStatus }) {
  const t = useTranslations("support.practitioner");
  return (
    <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
      {t(`statuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function TicketPriorityChip({ priority }: { priority: SupportTicketPriority }) {
  const t = useTranslations("support.practitioner");
  return (
    <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
      {t(`priorities.${priority}` as Parameters<typeof t>[0])}
    </span>
  );
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

  const submitReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await reply.mutateAsync({ message: message.trim() });
    setMessage("");
  };

  if (ticket.isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <ListStateSkeleton items={2} heightClass="h-40" />
      </div>
    );
  }

  if (ticket.isError || !ticket.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <StateCard
          title={t("states.detailError.heading")}
          note={t("states.detailError.note")}
          action={{
            label: t("states.detailError.back"),
            href: (
              <Link
                href="/practitioner/support"
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
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Link
              href="/practitioner/support"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              {t("detail.back")}
            </Link>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.eyebrow")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {item.subject}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {item.description ?? t("detail.noDescription")}
            </p>
          </div>

          <div className="app-panel-soft rounded-2xl px-4 py-3 text-sm text-text-secondary">
            <div className="flex items-center gap-2 text-text-primary dark:text-white/90">
              <LifeBuoy className="h-4 w-4 text-primary" />
              <span className="font-medium">{t("detail.helperTitle")}</span>
            </div>
            <p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">
              {t("detail.helperNote")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {t(`categories.${item.category}` as Parameters<typeof t>[0])}
          </span>
          <TicketStatusChip status={item.status} />
          <TicketPriorityChip priority={item.priority} />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-muted">
          <span>
            {t("detail.createdAt", { date: formatDateTime(item.createdAt, numLocale) })}
          </span>
          {item.lastMessageAt && (
            <span>
              {t("detail.lastReplyAt", {
                date: formatDateTime(item.lastMessageAt, numLocale),
              })}
            </span>
          )}
          {item.resolvedAt && (
            <span>
              {t("detail.resolvedAt", {
                date: formatDateTime(item.resolvedAt, numLocale),
              })}
            </span>
          )}
          {item.closedAt && (
            <span>
              {t("detail.closedAt", {
                date: formatDateTime(item.closedAt, numLocale),
              })}
            </span>
          )}
        </div>
      </section>

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
              {t("thread.heading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{t("thread.note")}</p>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {t("thread.count", { value: item.messages.length })}
          </span>
        </div>

        {item.messages.length > 0 ? (
          <div className="mt-5 space-y-3">
            {item.messages.map((entry) => (
              <MessageBubble
                key={entry.id}
                senderRole={entry.senderRole}
                message={entry.message}
                createdAt={entry.createdAt}
              />
            ))}
          </div>
        ) : (
          <StateCard
            title={t("thread.empty.heading")}
            note={t("thread.empty.note")}
            centered={false}
            className="mt-5 rounded-[24px] border-transparent bg-surface-secondary p-5 dark:bg-white/5"
          />
        )}
      </section>

      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white/95">
          {t("reply.heading")}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{t("reply.note")}</p>

        <form className="mt-5 space-y-4" onSubmit={submitReply}>
          <textarea
            rows={5}
            maxLength={4000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("reply.placeholder")}
            className="w-full rounded-[24px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none ring-0 transition placeholder:text-text-muted focus:border-primary/35 dark:bg-white/5 dark:text-white"
          />

          {reply.isError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {t("errors.generic")}
            </div>
          )}

          <button
            type="submit"
            disabled={reply.isPending || message.trim().length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reply.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("reply.submitting")}
              </>
            ) : (
              <>
                <SendHorizonal className="h-4 w-4" />
                {t("reply.submit")}
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
