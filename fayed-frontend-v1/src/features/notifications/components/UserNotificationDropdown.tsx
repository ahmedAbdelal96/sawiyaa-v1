"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { useUserNotifications, useMyUnreadNotificationCount, useMarkAllMyNotificationsRead, useMarkMyNotificationRead } from "../hooks/use-user-notifications";
import { formatUserNotificationDateTime } from "../lib/format-user-notification-date-time";
import {
  dispatchOpenMessagesShell,
} from "@/features/messages-shell/lib/messages-shell-events";
import { resolveNotificationClickTarget } from "../lib/resolve-notification-click-target";
import type { UserNotificationItem } from "../types/user-notifications.types";

type UserNotificationDropdownProps = {
  role: "patient" | "practitioner";
};

function resolveMessagesShellLane(
  lane: "session" | "support" | "followup",
): "session" | "practitioner" | "support" {
  return lane === "followup" ? "practitioner" : lane;
}

export default function UserNotificationDropdown({
  role,
}: UserNotificationDropdownProps) {
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

  const badgeValue = unreadCount > 99 ? "99+" : String(unreadCount);
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
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-border-light bg-surface-secondary text-text-secondary transition-colors hover:bg-primary-light hover:text-text-brand dark:border-border-light dark:bg-surface-secondary dark:text-text-secondary dark:hover:bg-surface-tertiary dark:hover:text-text-primary"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("dropdown.ariaLabel")}
        title={t("dropdown.title")}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -end-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {badgeValue}
          </span>
        ) : null}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        closeOnOutsideClick={false}
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
            <div className="space-y-2">
              {items.map((item) => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
                          {item.body}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-text-muted">
                        {formatUserNotificationDateTime(item.createdAt, locale)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-text-muted">
                        {item.readAt ? t("status.read") : t("status.unread")}
                      </span>
                      {item.action ? (
                        <span className="text-[11px] font-medium text-primary">
                          {item.action.label ?? t("actions.open")}
                        </span>
                      ) : null}
                    </div>
                  </>
                );

                const cardClassName = `block rounded-2xl border px-4 py-3 transition ${
                  item.readAt
                    ? "border-border-light bg-surface-secondary hover:border-primary/25 hover:bg-primary-light/40 dark:bg-surface-secondary"
                    : "border-primary/15 bg-primary-light/20 hover:border-primary/25 hover:bg-primary-light/40 dark:bg-primary/10"
                }`;

                if (item.action) {
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
                        className={`${cardClassName} text-start`}
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
                        className={cardClassName}
                      >
                        {content}
                      </Link>
                    );
                  }
                }

                return (
                  <div key={item.id} className={cardClassName}>
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
              : t("context.practitioner")}
          </p>
        </div>
      </Dropdown>
    </div>
  );
}
