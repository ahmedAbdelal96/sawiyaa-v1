import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

type AdminDashboardSectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function AdminDashboardSectionHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
}: AdminDashboardSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary dark:text-white/90">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs text-text-secondary dark:text-slate-400 leading-normal">{subtitle}</p>
        ) : null}
      </div>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref as never}
          className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors focus-visible:outline-none focus-visible:underline"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      ) : null}
    </div>
  );
}
