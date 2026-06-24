"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { useUserNotifications, useMyUnreadNotificationCount, useMarkAllMyNotificationsRead, useMarkMyNotificationRead } from "../hooks/use-user-notifications";
import { formatUserNotificationDateTime } from "../lib/format-user-notification-date-time";
import { getNotificationVisualProps } from "../lib/notification-visual-mapper";
import {
  dispatchOpenMessagesShell,
} from "@/features/messages-shell/lib/messages-shell-events";
import { resolveNotificationClickTarget } from "../lib/resolve-notification-click-target";
import { getMessagesPath } from "@/features/messages-shell/utils/messages-routes";
import type { UserNotificationItem } from "../types/user-notifications.types";

const TONE_CLASSES: Record<string, string> = {
  message: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  session: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  support: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  payment: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  system: "bg-gray-50/50 text-gray-700 border border-gray-100 dark:bg-white/5 dark:text-white/70 dark:border-white/10",
  warning: "bg-amber-50/50 text-amber-700 border border-amber-100 dark:bg-amber-500/5 dark:text-amber-300 dark:border-amber-500/10",
  content: "bg-rose-50/50 text-rose-700 border border-rose-100 dark:bg-rose-500/5 dark:text-rose-300 dark:border-rose-500/10",
};

type UserNotificationDropdownProps = {
  role: "patient" | "practitioner" | "admin";
};

function resolveMessagesShellLane(
  lane: "session" | "support" | "followup",
): "session" | "practitioner" | "support" {
  return lane === "followup" ? "practitioner" : lane;
}

export default function UserNotificationDropdown({
  role,
}: UserNotificationDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const t = useTranslations("notifications");
  const unreadCountQuery = useMyUnreadNotificationCount();
  const unreadCount = unreadCountQuery.data?.item.unreadCount ?? 0;
  const listQuery = useUserNotifications(
    { page: 1, limit: 5 },
    { enabled: isOpen },
  );
  const markReadMutation = useMarkMyNotificationRead();
  const markAllReadMutation = useMarkAllMyNotificationsRead();

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);

  const badgeValue = unreadCount > 9 ? "9+" : String(unreadCount);
  const maxDropdownHeightClass = "max-h-[min(70vh,520px)] overflow-hidden";

  const handleMarkRead = (item: UserNotificationItem) => {
    if (item.readAt) {
      return;
    }

    void markReadMutation.mutateAsync(item.id);
  };

  const handleMarkAllRead = () => {
    void markAllReadMutation.mutateAsync();
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary text-amber-600 dark:text-amber-400 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:bg-surface-tertiary hover:text-amber-700 dark:hover:text-amber-300 focus:outline-none overflow-visible"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("dropdown.ariaLabel")}
        title={t("dropdown.title")}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -end-1 z-10 flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold ring-2 ring-white dark:ring-surface-secondary">
            {badgeValue}
          </span>
        ) : null}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className={`absolute mt-[17px] flex w-[min(360px,calc(100vw-1rem))] flex-col rounded-2xl border border-border-light bg-surface-secondary p-4 shadow-theme-lg dark:border-border-light dark:bg-surface-secondary ${maxDropdownHeightClass} ${
          isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"
        }`}
      >
        <div className="shrink-0 border-b border-border-light pb-3 dark:border-border-light">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h5 className="text-lg font-semibold text-text-primary">
                {t("dropdown.title")}
              </h5>
              <p className="mt-1 text-xs text-text-secondary">
                {t("dropdown.note")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
                  {t("dropdown.count", { value: unreadCount })}
                </span>
              ) : null}
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary-light/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markAllReadMutation.isPending
                    ? t("actions.markAllReadLoading")
                    : t("actions.markAllRead")}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-3 pr-1">
          {listQuery.isLoading ? (
            <ListStateSkeleton items={3} heightClass="h-20" />
          ) : listQuery.isError ? (
            <StateCard
              title={t("dropdown.errorHeading")}
              note={t("dropdown.errorNote")}
              action={{
                label: t("dropdown.retry"),
                onClick: () => listQuery.refetch(),
              }}
            />
          ) : items.length > 0 ? (
            <div className="divide-y divide-border-light/70 dark:divide-white/10">
              {items.map((item) => {
                 const notificationSlug =
                   item.typeSlug ??
                   (item as any).type ??
                   (item as any).notificationType ??
                   item.title;

                 const visual = getNotificationVisualProps(
                   notificationSlug,
                   item.category,
                   t,
                   "user",
                   locale,
                   item.context,
                   item.primaryAction,
                 );
                 const toneClass = TONE_CLASSES[visual.tone] || TONE_CLASSES.system;

                 const content = (
                   <div className="flex items-start gap-3 w-full py-3 px-2 transition hover:bg-surface-tertiary/60 dark:hover:bg-white/5">
                     <div className={`p-2.5 rounded-full shrink-0 relative ${toneClass}`}>
                       {visual.icon}
                       {!item.readAt ? (
                         <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-surface-secondary" />
                       ) : null}
                     </div>
                     <div className="min-w-0 flex-1 text-start space-y-1">
                       <div className="flex items-start justify-between gap-2">
                         <p className={`text-sm leading-snug text-text-primary dark:text-white/95 ${!item.readAt ? "font-bold" : "font-medium"}`}>
                           {visual.title}
                         </p>
                         <span className="shrink-0 text-[10px] text-text-muted mt-0.5 whitespace-nowrap">
                           {formatUserNotificationDateTime(item.createdAt, locale)}
                         </span>
                       </div>
                       {visual.subtitle && (
                         <p className="text-[10px] text-text-muted leading-none font-medium">
                           {visual.subtitle}
                         </p>
                       )}
                       <p className="text-xs leading-relaxed text-text-secondary line-clamp-2">
                         {visual.contextLine || item.body}
                       </p>
                       <div className="flex items-center justify-between gap-3 pt-1">
                         <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                           {item.readAt ? t("status.read") : t("status.unread")}
                         </span>
                         {(item.action || item.primaryAction) ? (
                           <span className="text-[10px] font-bold text-primary hover:underline">
                             {visual.actionLabel || item.action?.label || t("actions.open")}
                           </span>
                         ) : null}
                       </div>
                     </div>
                   </div>
                 );

                 const itemClassName = "block w-full text-start focus:outline-none transition first:mt-0";

                 if (item.action || item.primaryAction) {
                   const target = resolveNotificationClickTarget({
                     item,
                     role,
                   });

                   if (target.kind === "messages-shell") {
                     return (
                       <button
                         key={item.id}
                         type="button"
                         onClick={() => {
                           setIsOpen(false);
                           handleMarkRead(item);
                           dispatchOpenMessagesShell({
                             lane: resolveMessagesShellLane(target.lane),
                             threadId: target.threadId,
                           });
                         }}
                         className={itemClassName}
                       >
                         {content}
                       </button>
                     );
                   }

                   if (target.kind === "href") {
                     return (
                       <Link
                         key={item.id}
                         href={target.href as never}
                         onClick={() => {
                           setIsOpen(false);
                           handleMarkRead(item);
                         }}
                         className={itemClassName}
                       >
                         {content}
                       </Link>
                     );
                   }
                 }

                 return (
                   <div key={item.id} className={itemClassName}>
                     {content}
                   </div>
                 );
               })}
            </div>
          ) : (
            <StateCard
              title={t("dropdown.emptyHeading")}
              note={t("dropdown.emptyNote")}
            />
          )}
        </div>

        <div className="shrink-0 border-t border-border-light pt-3 dark:border-border-light">
          <p className="text-xs text-text-secondary">
            {role === "patient"
              ? t("context.patient")
              : role === "admin"
              ? t("context.admin")
              : t("context.practitioner")}
          </p>
        </div>
      </Dropdown>
    </div>
  );
}
