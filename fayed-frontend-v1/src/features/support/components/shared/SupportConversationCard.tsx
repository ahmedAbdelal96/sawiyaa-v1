"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, LifeBuoy } from "lucide-react";

type Props = {
  href: string;
  subject: string;
  categoryLabel: string;
  statusLabel: string;
  createdAtLabel: string;
  lastReplyAtLabel?: string | null;
  unreadCount?: number;
  hasUnread?: boolean;
};

export default function SupportConversationCard({
  href,
  subject,
  categoryLabel,
  statusLabel,
  createdAtLabel,
  lastReplyAtLabel,
  unreadCount,
  hasUnread,
}: Props) {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const t = useTranslations("support");

  return (
    <Link
      href={href as never}
      className="app-panel-soft group block rounded-[24px] p-4 transition hover:border-primary/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
              <LifeBuoy className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="break-words text-sm font-semibold leading-6 text-text-primary dark:text-white/95">
                  {subject}
                </p>
                {hasUnread || (unreadCount ?? 0) > 0 ? (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                    <span className="me-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                    {(unreadCount ?? 0) > 0 ? unreadCount : ""}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-text-muted">{categoryLabel}</p>
            </div>
          </div>
        </div>

        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-light bg-white text-text-muted opacity-80 transition group-hover:opacity-100 dark:bg-white/5 ${isRTL ? "rotate-180" : ""}`}
          aria-label={t("list.openTicket")}
          title={t("list.openTicket")}
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-muted">
        <span className="app-chip rounded-full px-2.5 py-1 text-[11px] font-medium">{statusLabel}</span>
        <span>{createdAtLabel}</span>
        {lastReplyAtLabel ? <span>{lastReplyAtLabel}</span> : null}
      </div>
    </Link>
  );
}

