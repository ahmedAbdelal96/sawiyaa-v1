"use client";

import React, { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { Link, usePathname } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { useAdminNotifications } from "@/features/admin/notifications/hooks/use-admin-notifications";
import { getAdminNotificationStatusTone } from "@/features/admin/notifications/lib/admin-notification-status";
import { formatAdminNotificationDateTime } from "@/features/admin/notifications/components/admin-notification-utils";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { PermissionKey } from "@/lib/auth/permissions";
import { getNotificationVisualProps } from "@/features/notifications/lib/notification-visual-mapper";

const TONE_CLASSES: Record<string, string> = {
  message: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  session: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  support: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  payment: "bg-teal-50/50 text-teal-700 border border-teal-100 dark:bg-teal-500/5 dark:text-teal-300 dark:border-teal-500/10",
  system: "bg-gray-50/50 text-gray-700 border border-gray-100 dark:bg-white/5 dark:text-white/70 dark:border-white/10",
  warning: "bg-amber-50/50 text-amber-700 border border-amber-100 dark:bg-amber-500/5 dark:text-amber-300 dark:border-amber-500/10",
  content: "bg-rose-50/50 text-rose-700 border border-rose-100 dark:bg-rose-500/5 dark:text-rose-300 dark:border-rose-500/10",
};

export default function NotificationDropdown() {
  const locale = useLocale();
  const isRtl = locale.startsWith("ar");
  const pathname = usePathname();
  const t = useTranslations("admin-notifications");
  const [isOpen, setIsOpen] = useState(false);

  const pathWithoutLocale = useMemo(() => {
    const localePrefix = `/${locale}`;
    return pathname.startsWith(localePrefix) ? pathname.slice(localePrefix.length) || "/" : pathname;
  }, [locale, pathname]);

  const isAdminArea = pathWithoutLocale === "/admin" || pathWithoutLocale.startsWith("/admin/");
  const { data: permissionData } = useCurrentUserPermissions(isAdminArea);
  const canReadNotifications = permissionData?.permissions.includes(PermissionKey.NOTIFICATION_OPS_READ) ?? false;
  const notifications = useAdminNotifications(
    { page: 1, limit: 5 },
    { enabled: isAdminArea && canReadNotifications },
  );
  const items = notifications.data?.items ?? [];
  const total = notifications.data?.pagination.totalItems ?? 0;

  if (!isAdminArea || !canReadNotifications) return null;

  return (
    <div className="relative">
      <button
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary text-amber-600 dark:text-amber-400 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:bg-surface-tertiary hover:text-amber-700 dark:hover:text-amber-300 focus:outline-none overflow-visible"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("notifications.dropdown.ariaLabel")}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>

        {total > 0 ? (
          <span className="absolute -top-1 -end-1 z-10 flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold ring-2 ring-white dark:ring-surface-secondary">
            {total > 9 ? "9+" : total}
          </span>
        ) : null}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        closeOnOutsideClick={false}
        className={`absolute mt-[17px] flex w-[min(340px,calc(100vw-1rem))] flex-col rounded-2xl border border-border-light bg-surface-secondary p-4 shadow-theme-lg dark:border-border-light dark:bg-surface-secondary ${
          isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"
        }`}
      >
        <div className="border-b border-border-light pb-3 dark:border-border-light">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h5 className="text-lg font-semibold text-text-primary">
                {t("notifications.dropdown.title")}
              </h5>
              <p className="mt-1 text-xs text-text-secondary">
                {t("notifications.dropdown.note")}
              </p>
            </div>
            {notifications.data ? (
              <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
                {t("notifications.dropdown.count", { value: total })}
              </span>
            ) : null}
          </div>
        </div>

        <div className="py-3">
          {notifications.isLoading ? (
            <ListStateSkeleton items={3} heightClass="h-16" />
          ) : notifications.isError ? (
            <StateCard
              title={t("notifications.dropdown.errorHeading")}
              note={t("notifications.dropdown.errorNote")}
              action={{
                label: t("notifications.dropdown.retry"),
                onClick: () => notifications.refetch(),
              }}
            />
          ) : items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => {
                const notificationSlug =
                  item.typeSlug ??
                  (item as any).type ??
                  (item as any).notificationType;
                
                const visual = getNotificationVisualProps(
                  notificationSlug,
                  item.category,
                  t,
                  "admin",
                  locale,
                  item.context,
                  item.primaryAction,
                );
                const toneClass = TONE_CLASSES[visual.tone] || TONE_CLASSES.system;

                return (
                  <Link
                    key={item.id}
                    href={`/admin/notifications/${item.id}` as never}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 transition hover:border-primary/25 hover:bg-primary-light/40 dark:bg-surface-secondary text-start"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${toneClass}`}>
                        {visual.icon}
                      </div>
                      <div className="min-w-0 flex-1 text-start">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAdminNotificationStatusTone(
                              item.status,
                            )}`}
                          >
                            {t(`notifications.statuses.${item.status}` as Parameters<typeof t>[0])}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {formatAdminNotificationDateTime(item.updatedAt, locale)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95 leading-normal">
                          {visual.title}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary leading-normal font-medium">
                          {visual.contextLine || visual.subtitle}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <StateCard
              title={t("notifications.dropdown.emptyHeading")}
              note={t("notifications.dropdown.emptyNote")}
            />
          )}
        </div>

        <div className="border-t border-border-light pt-3 dark:border-border-light">
          <Link
            href="/admin/notifications"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            {t("notifications.dropdown.openAll")}
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}
