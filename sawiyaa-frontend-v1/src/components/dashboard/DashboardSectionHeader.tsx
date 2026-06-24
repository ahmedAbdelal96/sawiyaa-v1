import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type DashboardSectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function DashboardSectionHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
}: DashboardSectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref as never}
          className="inline-flex items-center gap-1 rounded-xl border border-border-light bg-white px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:border-primary/30 hover:bg-primary-light hover:text-text-brand dark:bg-white/5 dark:text-white/85 dark:hover:bg-primary/15 dark:hover:text-primary-light"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      ) : null}
    </div>
  );
}

