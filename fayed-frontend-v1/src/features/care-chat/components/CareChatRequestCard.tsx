"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, MessageSquareText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CareChatRequestStatusChip } from "./CareChatStatusChip";
import {
  formatCareChatDateTime,
  getCareChatRequestStateKey,
} from "../lib/care-chat-ui";
import type { CareChatRequestItem } from "../types/care-chat.types";

type Props = {
  item: CareChatRequestItem;
  href: string;
  viewer: "patient" | "practitioner" | "admin";
};

export default function CareChatRequestCard({ item, href, viewer }: Props) {
  const t = useTranslations("care-chat");
  const locale = useLocale();

  const counterpartName =
    viewer === "patient"
      ? item.practitioner.displayName ?? t("common.fallbacks.practitioner")
      : item.patient.displayName ?? t("common.fallbacks.patient");

  return (
    <Link
      href={href as never}
      className="app-panel-soft block rounded-[24px] p-4 transition hover:border-primary/25"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CareChatRequestStatusChip status={item.status} />
            {item.linkedConversationId ? (
              <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
                {t("common.linkedConversation")}
              </span>
            ) : null}
            {item.hasUnread || item.unreadCount > 0 ? (
              <span
                className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
              >
                <span className="me-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                {item.unreadCount > 0 ? item.unreadCount : ""}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-sm font-semibold text-text-primary dark:text-white/95">
            {t(`common.viewerHeadings.${viewer}` as Parameters<typeof t>[0], {
              name: counterpartName,
            })}
          </h3>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {t(
              `common.requestStateNotes.${getCareChatRequestStateKey(item.status)}` as Parameters<typeof t>[0],
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
            <span>
              {t("common.requestedAt", {
                date: formatCareChatDateTime(item.requestedAt, locale),
              })}
            </span>
            {item.relatedSessionId ? (
              <span className="font-mono">
                {t("common.relatedSessionShort", { id: item.relatedSessionId })}
              </span>
            ) : null}
          </div>
        </div>

        <span className="inline-flex items-center gap-2 text-xs font-medium text-primary">
          {item.linkedConversationId ? (
            <>
              <MessageSquareText className="h-4 w-4" />
              {t("common.actions.openConversation")}
            </>
          ) : (
            <>
              {t("common.actions.reviewRequest")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
