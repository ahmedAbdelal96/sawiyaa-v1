import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AdminDashboardSectionHeader } from "./AdminDashboardSectionHeader";

type QueueItem = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  badge?: ReactNode;
};

type AdminDashboardQueueCardProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  emptyText: string;
  items: QueueItem[];
};

export function AdminDashboardQueueCard({
  title,
  subtitle,
  actionLabel,
  actionHref,
  emptyText,
  items,
}: AdminDashboardQueueCardProps) {
  const rowClassName = cn(
    "group flex items-start justify-between gap-3 px-4 py-3.5 transition",
    "hover:bg-primary-light/55 dark:hover:bg-primary/10",
  );

  return (
    <article className="app-panel rounded-[30px] p-5 sm:p-6">
      <AdminDashboardSectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />

      {items.length === 0 ? (
        <div className="app-panel-soft rounded-[24px] border border-dashed p-4 text-sm text-text-muted dark:border-white/10">
          {emptyText}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[24px] bg-surface-secondary/75 divide-y divide-border-light/80 dark:divide-white/10 dark:bg-white/[0.03]">
          {items.map((item) => {
            const content = (
              <div className={rowClassName}>
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
                <Link href={item.href as never} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
