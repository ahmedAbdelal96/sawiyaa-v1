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
    "group flex items-start justify-between gap-3 py-3 transition rounded-xl px-3",
    "hover:bg-slate-50 dark:hover:bg-white/[0.03]",
  );

  return (
    <article className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03] shadow-sm sm:p-6">
      <AdminDashboardSectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />

      {items.length === 0 ? (
        <div className="mt-4 flex h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
          <p className="text-sm text-text-muted">{emptyText}</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
          {items.map((item) => {
            const content = (
              <div className={rowClassName}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
                    {item.title}
                  </p>
                  {item.subtitle ? (
                    <p className="mt-1 text-xs text-text-secondary">{item.subtitle}</p>
                  ) : null}
                </div>
                {item.badge ? <div className="shrink-0">{item.badge}</div> : null}
              </div>
            );

            if (!item.href) {
              return <li key={item.id} className="py-1">{content}</li>;
            }

            return (
              <li key={item.id} className="py-1">
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
