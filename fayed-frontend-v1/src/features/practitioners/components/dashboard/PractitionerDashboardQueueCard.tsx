import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PractitionerDashboardSectionHeader } from "./PractitionerDashboardSectionHeader";

type QueueItem = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  badge?: ReactNode;
};

type PractitionerDashboardQueueCardProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  emptyText: string;
  items: QueueItem[];
};

export function PractitionerDashboardQueueCard({
  title,
  subtitle,
  actionLabel,
  actionHref,
  emptyText,
  items,
}: PractitionerDashboardQueueCardProps) {
  const rowClassName = cn(
    "group flex items-center justify-between gap-3 py-2.5 px-3 transition rounded-2xl",
    "hover:bg-slate-50/60 dark:hover:bg-white/[0.02] border border-transparent hover:border-slate-100 dark:hover:border-white/5",
  );

  return (
    <article className="flex flex-col justify-between h-full rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03] shadow-sm sm:p-6 min-h-[350px]">
      <div className="flex-1 flex flex-col">
        <PractitionerDashboardSectionHeader
          title={title}
          subtitle={subtitle}
          actionLabel={actionLabel}
          actionHref={actionHref}
        />

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/30 dark:bg-white/[0.01] p-6 mt-2">
            <p className="text-sm text-text-muted text-center">{emptyText}</p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100/70 dark:divide-white/5 flex-1">
            {items.map((item) => {
              const content = (
                <div className={rowClassName}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95 group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="mt-1 text-xs text-text-secondary dark:text-slate-400">{item.subtitle}</p>
                    ) : null}
                  </div>
                  {item.badge ? <div className="shrink-0">{item.badge}</div> : null}
                </div>
              );

              if (!item.href) {
                return (
                  <li key={item.id} className="py-0.5">
                    {content}
                  </li>
                );
              }

              return (
                <li key={item.id} className="py-0.5">
                  <Link
                    href={item.href as never}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl"
                  >
                    {content}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
