import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { DashboardSectionHeader } from "./DashboardSectionHeader";

type QueueItem = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  badge?: ReactNode;
};

type DashboardQueueCardProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  emptyText: string;
  items: QueueItem[];
};

export function DashboardQueueCard({
  title,
  subtitle,
  actionLabel,
  actionHref,
  emptyText,
  items,
}: DashboardQueueCardProps) {
  return (
    <article className="app-panel rounded-3xl p-5">
      <DashboardSectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-light p-4 text-sm text-text-muted dark:border-white/10">
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const content = (
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-border-light bg-surface p-3 transition hover:border-primary/25 hover:bg-primary-light/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-primary/10">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
                    {item.title}
                  </p>
                  {item.subtitle ? (
                    <p className="mt-0.5 text-xs text-text-muted">{item.subtitle}</p>
                  ) : null}
                </div>
                {item.badge ? <div className="shrink-0">{item.badge}</div> : null}
              </div>
            );

            if (!item.href) {
              return <li key={item.id}>{content}</li>;
            }

            return (
              <li key={item.id}>
                <Link href={item.href as never}>{content}</Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

