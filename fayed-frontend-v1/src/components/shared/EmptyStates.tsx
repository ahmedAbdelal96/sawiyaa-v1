import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "app-panel flex min-h-[340px] flex-col items-center justify-center rounded-[28px] px-6 py-12 text-center",
        className
      )}
    >
      {icon && <div className="mb-5">{icon}</div>}

      <h3 className="mb-2 text-lg font-semibold text-text-primary dark:text-white">
        {title}
      </h3>

      {description && (
        <p className="mb-6 max-w-md text-sm leading-7 text-text-secondary dark:text-text-secondary">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} className="gap-2">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface NoDataProps {
  entity: string;
  onAdd?: () => void;
  addLabel?: string;
}

export function NoData({ entity, onAdd, addLabel }: NoDataProps) {
  const t = useTranslations("common.emptyStates.noData");

  return (
    <EmptyState
      icon={
        <div className="app-panel-soft flex h-20 w-20 items-center justify-center rounded-full">
          <svg
            className="h-10 w-10 text-text-muted dark:text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      }
      title={t("title", { entity })}
      description={t("description", { entity })}
      action={
        onAdd
          ? {
              label: addLabel || t("addAction", { entity }),
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

interface NoResultsProps {
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function NoResults({ searchQuery, onClearSearch }: NoResultsProps) {
  const t = useTranslations("common.emptyStates.noResults");

  return (
    <EmptyState
      icon={
        <div className="app-panel-soft flex h-20 w-20 items-center justify-center rounded-full">
          <svg
            className="h-10 w-10 text-primary dark:text-primary-light"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      }
      title={t("title")}
      description={
        searchQuery
          ? t("descriptionWithQuery", { query: searchQuery })
          : t("descriptionFallback")
      }
      action={
        onClearSearch
          ? {
              label: t("clearAction"),
              onClick: onClearSearch,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

export function NoBookings({ onAdd }: { onAdd?: () => void }) {
  const t = useTranslations("common.emptyStates.bookings");

  return (
    <EmptyState
      icon={
        <div className="app-panel-soft flex h-20 w-20 items-center justify-center rounded-full">
          <svg
            className="h-10 w-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      }
      title={t("title")}
      description={t("description")}
      action={
        onAdd
          ? {
              label: t("action"),
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

export function NoClients({ onAdd }: { onAdd?: () => void }) {
  const t = useTranslations("common.emptyStates.clients");

  return (
    <EmptyState
      icon={
        <div className="app-empty-icon">
          <svg
            className="h-10 w-10 text-primary dark:text-primary-light"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
      }
      title={t("title")}
      description={t("description")}
      action={
        onAdd
          ? {
              label: t("action"),
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

export function NoServices({ onAdd }: { onAdd?: () => void }) {
  const t = useTranslations("common.emptyStates.services");

  return (
    <EmptyState
      icon={
        <div className="app-empty-icon">
          <svg
            className="h-10 w-10 text-primary dark:text-primary-light"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
      }
      title={t("title")}
      description={t("description")}
      action={
        onAdd
          ? {
              label: t("action"),
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

export function NoStaff({ onAdd }: { onAdd?: () => void }) {
  const t = useTranslations("common.emptyStates.staff");

  return (
    <EmptyState
      icon={
        <div className="app-empty-icon">
          <svg
            className="h-10 w-10 text-primary dark:text-primary-light"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
      }
      title={t("title")}
      description={t("description")}
      action={
        onAdd
          ? {
              label: t("action"),
              onClick: onAdd,
              icon: (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}
