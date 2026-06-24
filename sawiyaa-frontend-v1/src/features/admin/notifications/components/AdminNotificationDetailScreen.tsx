"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BellRing } from "lucide-react";
import { isAppError } from "@/lib/api/errors";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { useAdminNotificationDetails } from "../hooks/use-admin-notifications";
import AdminNotificationDetailsPanel from "./AdminNotificationDetailsPanel";

export default function AdminNotificationDetailScreen({
  notificationId,
}: {
  notificationId: string;
}) {
  const t = useTranslations("admin-notifications");
  const locale = useLocale();
  const notification = useAdminNotificationDetails(notificationId);
  const item = notification.data?.item;

  if (notification.isLoading) {
    return <ListStateSkeleton items={4} heightClass="h-28" />;
  }

  if (notification.isError) {
    const error = notification.error;
    const isNotFound = isAppError(error) && error.errorType === "NOT_FOUND";

    return (
      <StateCard
        icon={<BellRing className="h-5 w-5 text-primary" />}
        title={
          isNotFound
            ? t("notifications.states.notFound.heading")
            : t("notifications.states.detailError.heading")
        }
        note={
          isNotFound
            ? t("notifications.states.notFound.note")
            : t("notifications.states.detailError.note")
        }
        action={{
          label: isNotFound
            ? t("notifications.detail.back")
            : t("notifications.states.detailError.retry"),
          href: isNotFound ? (
            <Link
              href="/admin/notifications"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("notifications.detail.back")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => notification.refetch()}
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("notifications.states.detailError.retry")}
            </button>
          ),
        }}
        className="rounded-[28px]"
      />
    );
  }

  if (!item) return null;

  return (
    <div className="space-y-5">
      {/* Compact Header */}
      <div className="flex items-center gap-3.5 pb-2">
        <ActionIconLink
          href="/admin/notifications"
          intent="view"
          label={t("notifications.detail.back")}
          icon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            {t("notifications.detail.breadcrumb")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-text-primary dark:text-white/95 mt-0.5">
            {t("notifications.detail.title")}
          </h1>
        </div>
      </div>

      <AdminNotificationDetailsPanel item={item} isDrawer={false} />
    </div>
  );
}
