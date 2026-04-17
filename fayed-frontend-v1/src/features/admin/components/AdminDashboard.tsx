"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BellRing,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Headset,
  MessageSquare,
  Shapes,
  ShieldAlert,
  Star,
  Wallet,
} from "lucide-react";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import { useAdminSupportTickets } from "@/features/support/hooks/use-support";
import { useAdminPractitionerApplications } from "../practitioner-applications/hooks/use-practitioner-applications";
import { useAdminNotifications } from "@/features/admin/notifications/hooks/use-admin-notifications";
import type { SupportTicketPriority } from "@/features/support/types/support.types";
import type {
  PractitionerApplicationStatus,
  PractitionerType,
} from "@/features/practitioners/types/practitioners.types";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { getAdminNotificationStatusTone } from "@/features/admin/notifications/lib/admin-notification-status";

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const PRIORITY_DOT: Partial<Record<SupportTicketPriority, string>> = {
  URGENT: "bg-rose-500",
  HIGH: "bg-amber-400",
};

type ModuleStage = "live" | "limited" | "placeholder";

type ModuleCard = {
  key:
    | "support"
    | "applications"
    | "notifications"
    | "specialties"
    | "settlements"
    | "reviews"
    | "moderationReports"
    | "payments"
    | "careChat"
    | "training"
    | "articles";
  href: string;
  icon: React.ReactNode;
  stage: ModuleStage;
};

const MODULE_CARDS: ModuleCard[] = [
  {
    key: "support",
    href: "/admin/support",
    icon: <Headset className="h-5 w-5" />,
    stage: "live",
  },
  {
    key: "applications",
    href: "/admin/practitioner-applications",
    icon: <ClipboardList className="h-5 w-5" />,
    stage: "live",
  },
  {
    key: "notifications",
    href: "/admin/notifications",
    icon: <BellRing className="h-5 w-5" />,
    stage: "limited",
  },
  {
    key: "specialties",
    href: "/admin/specialties",
    icon: <Shapes className="h-5 w-5" />,
    stage: "limited",
  },
  {
    key: "reviews",
    href: "/admin/reviews",
    icon: <Star className="h-5 w-5" />,
    stage: "live",
  },
  {
    key: "moderationReports",
    href: "/admin/moderation/reports",
    icon: <ShieldAlert className="h-5 w-5" />,
    stage: "limited",
  },
  {
    key: "careChat",
    href: "/admin/care-chat",
    icon: <MessageSquare className="h-5 w-5" />,
    stage: "live",
  },
  {
    key: "payments",
    href: "/admin/payments",
    icon: <CreditCard className="h-5 w-5" />,
    stage: "limited",
  },
  {
    key: "settlements",
    href: "/admin/settlements",
    icon: <Wallet className="h-5 w-5" />,
    stage: "limited",
  },
  {
    key: "training",
    href: "/admin/training",
    icon: <GraduationCap className="h-5 w-5" />,
    stage: "limited",
  },
  {
    key: "articles",
    href: "/admin/articles",
    icon: <FileText className="h-5 w-5" />,
    stage: "limited",
  },
];

const APP_STATUS_CLASS: Record<PractitionerApplicationStatus, string> = {
  DRAFT: "bg-surface-tertiary text-text-muted dark:bg-white/10",
  SUBMITTED: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  ARCHIVED: "bg-surface-tertiary text-text-muted dark:bg-white/10",
};

function SupportQueuePanel() {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useAdminSupportTickets({
    status: "OPEN",
    limit: 5,
  });

  return (
    <div className="app-panel flex flex-col rounded-[28px]">
      <div className="flex items-center justify-between border-b border-border-light px-5 py-4 dark:border-white/8">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
            <Headset className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("workspace.support.heading")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("workspace.support.note")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
              {t("workspace.support.count", { value: data.pagination.totalItems })}
            </span>
          )}
          <ActionIconLink
            href="/admin/support"
            intent="view"
            label={t("workspace.support.viewAll")}
            icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
          />
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="p-5">
            <ListStateSkeleton items={4} heightClass="h-16" />
          </div>
        ) : isError ? (
          <div className="p-5">
            <StateCard
              title={t("workspace.support.errorHeading")}
              note={t("workspace.support.errorNote")}
              action={{ label: t("workspace.support.retry"), onClick: () => refetch() }}
            />
          </div>
        ) : data && data.items.length > 0 ? (
          <ul>
            {data.items.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/admin/support/${ticket.id}` as never}
                  className="flex items-start justify-between gap-3 border-b border-border-light px-5 py-3.5 transition last:border-0 hover:bg-surface-secondary dark:border-white/8 dark:hover:bg-white/4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {PRIORITY_DOT[ticket.priority] && (
                        <span
                          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[ticket.priority]}`}
                        />
                      )}
                      <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
                        {ticket.subject}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {ticket.category} - {formatDate(ticket.createdAt, locale)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <StateCard
              title={t("workspace.support.emptyHeading")}
              note={t("workspace.support.empty")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationsQueuePanel() {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useAdminPractitionerApplications(
    { status: "SUBMITTED", limit: 5 },
    true,
  );

  return (
    <div className="app-panel flex flex-col rounded-[28px]">
      <div className="flex items-center justify-between border-b border-border-light px-5 py-4 dark:border-white/8">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("workspace.applications.heading")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("workspace.applications.note")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
              {t("workspace.applications.count", { value: data.pagination.total })}
            </span>
          )}
          <ActionIconLink
            href="/admin/practitioner-applications"
            intent="view"
            label={t("workspace.applications.viewAll")}
            icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
          />
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="p-5">
            <ListStateSkeleton items={4} heightClass="h-16" />
          </div>
        ) : isError ? (
          <div className="p-5">
            <StateCard
              title={t("workspace.applications.errorHeading")}
              note={t("workspace.applications.errorNote")}
              action={{
                label: t("workspace.applications.retry"),
                onClick: () => refetch(),
              }}
            />
          </div>
        ) : data && data.applications.length > 0 ? (
          <ul>
            {data.applications.map((app) => (
              <li key={app.applicationId}>
                <Link
                  href={`/admin/practitioner-applications/${app.applicationId}`}
                  className="flex items-start justify-between gap-3 border-b border-border-light px-5 py-3.5 transition last:border-0 hover:bg-surface-secondary dark:border-white/8 dark:hover:bg-white/4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
                      {app.displayName ?? t("dashboard.pendingApplications.noName")}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {t(`practitionerType.${app.practitionerType as PractitionerType}`)}{" "}
                      {app.submittedAt ? `- ${formatDate(app.submittedAt, locale)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`ms-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      APP_STATUS_CLASS[app.applicationStatus as PractitionerApplicationStatus]
                    }`}
                  >
                    {t(`status.${app.applicationStatus as PractitionerApplicationStatus}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <StateCard
              title={t("workspace.applications.emptyHeading")}
              note={t("workspace.applications.empty")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationsQueuePanel() {
  const tNotifications = useTranslations("admin-notifications");
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useAdminNotifications({
    page: 1,
    limit: 5,
  });

  return (
    <div className="app-panel flex flex-col rounded-[28px]">
      <div className="flex items-center justify-between border-b border-border-light px-5 py-4 dark:border-white/8">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            <BellRing className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {tNotifications("notifications.queue.heading")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {tNotifications("notifications.queue.note")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data ? (
            <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
              {tNotifications("notifications.queue.count", {
                value: data.pagination.totalItems,
              })}
            </span>
          ) : null}
          <ActionIconLink
            href="/admin/notifications"
            intent="view"
            label={tNotifications("notifications.queue.viewAll")}
            icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
          />
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="p-5">
            <ListStateSkeleton items={4} heightClass="h-16" />
          </div>
        ) : isError ? (
          <div className="p-5">
            <StateCard
              title={tNotifications("notifications.queue.errorHeading")}
              note={tNotifications("notifications.queue.errorNote")}
              action={{
                label: tNotifications("notifications.queue.retry"),
                onClick: () => refetch(),
              }}
            />
          </div>
        ) : data && data.items.length > 0 ? (
          <ul>
            {data.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/notifications/${item.id}` as never}
                  className="flex items-start justify-between gap-3 border-b border-border-light px-5 py-3.5 transition last:border-0 hover:bg-surface-secondary dark:border-white/8 dark:hover:bg-white/4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getAdminNotificationStatusTone(
                          item.status,
                        )}`}
                      >
                        {tNotifications(
                          `notifications.statuses.${item.status}` as Parameters<
                            typeof tNotifications
                          >[0],
                        )}
                      </span>
                      <span className="truncate text-sm font-medium text-text-primary dark:text-white/95">
                        {tNotifications("notifications.list.itemTitle", {
                          slug: item.typeSlug,
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {tNotifications(
                        `notifications.categories.${item.category}` as Parameters<
                          typeof tNotifications
                        >[0],
                      )}
                      {" - "}
                      {formatDate(item.updatedAt, locale)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <StateCard
              title={tNotifications("notifications.queue.emptyHeading")}
              note={tNotifications("notifications.queue.empty")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCardSection({
  title,
  note,
  modules,
}: {
  title: string;
  note: string;
  modules: ModuleCard[];
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {title}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{note}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((mod) => (
          <AdminModuleCard key={mod.key} module={mod} />
        ))}
      </div>
    </section>
  );
}

function AdminModuleCard({ module }: { module: ModuleCard }) {
  const t = useTranslations("admin-area");
  const tNotifications = useTranslations("admin-notifications");
  const isLive = module.stage === "live";
  const isLimited = module.stage === "limited";
  const isPlaceholder = module.stage === "placeholder";

  const title =
    module.key === "notifications"
      ? tNotifications("notifications.module.title")
      : t(`workspace.modules.${module.key}.title` as Parameters<typeof t>[0]);
  const description =
    module.key === "notifications"
      ? tNotifications("notifications.module.description")
      : t(`workspace.modules.${module.key}.description` as Parameters<typeof t>[0]);

  const cardClass = `group flex flex-col gap-4 rounded-[24px] border p-5 transition ${
    isLive
      ? "app-panel hover:border-primary/25"
      : isLimited
        ? "border-border-light bg-surface-primary hover:border-border-strong dark:bg-white/5"
        : "border-dashed border-border-light bg-surface-secondary/70 dark:bg-white/[0.03]"
  }`;

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
            isLive
              ? "bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light"
              : isLimited
                ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                : "bg-surface-tertiary text-text-muted dark:bg-white/8 dark:text-white/40"
          }`}
        >
          {module.icon}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isLive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              : isLimited
                ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                : "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/50"
          }`}
        >
          {t(`workspace.readiness.${module.stage}.label` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div>
        <p
          className={`text-sm font-semibold ${
            isLive
              ? "text-text-primary dark:text-white/95"
              : "text-text-primary/85 dark:text-white/80"
          }`}
        >
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3">
        <p className="text-xs text-text-muted">
          {t(`workspace.readiness.${module.stage}.note` as Parameters<typeof t>[0])}
        </p>
        {!isPlaceholder ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              isLive ? "text-primary" : "text-text-muted"
            }`}
          >
            {t(`workspace.readiness.${module.stage}.action` as Parameters<typeof t>[0])}
            <ArrowRight size={13} className="rtl:rotate-180" />
          </span>
        ) : null}
      </div>
    </>
  );

  if (isPlaceholder) {
    return <div className={cardClass}>{cardContent}</div>;
  }

  return (
    <Link href={module.href as never} className={cardClass}>
      {cardContent}
    </Link>
  );
}

export default function AdminDashboard() {
  const t = useTranslations("admin-area");

  const liveModules = MODULE_CARDS.filter((module) => module.stage === "live");
  const limitedModules = MODULE_CARDS.filter((module) => module.stage === "limited");
  const placeholderModules = MODULE_CARDS.filter(
    (module) => module.stage === "placeholder",
  );

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border border-border-light bg-surface-primary px-6 py-5 dark:bg-white/5">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
          {t("workspace.page.title")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{t("workspace.page.subtitle")}</p>
        <p className="mt-3 text-sm text-text-secondary">{t("workspace.page.honestyNote")}</p>
      </div>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t("workspace.queues.heading")}
        </h2>
        <div className="grid gap-5 xl:grid-cols-3">
          <SupportQueuePanel />
          <ApplicationsQueuePanel />
          <NotificationsQueuePanel />
        </div>
      </section>

      <ModuleCardSection
        title={t("workspace.live.heading")}
        note={t("workspace.live.note")}
        modules={liveModules}
      />

      <ModuleCardSection
        title={t("workspace.limited.heading")}
        note={t("workspace.limited.note")}
        modules={limitedModules}
      />

      <ModuleCardSection
        title={t("workspace.placeholder.heading")}
        note={t("workspace.placeholder.note")}
        modules={placeholderModules}
      />
    </div>
  );
}
