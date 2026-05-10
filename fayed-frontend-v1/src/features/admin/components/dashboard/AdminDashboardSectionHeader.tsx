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
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-[1.05rem]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 max-w-[60ch] text-sm leading-6 text-text-secondary">{subtitle}</p>
        ) : null}
      </div>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref as never}
          className="app-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-text-secondary transition hover:border-primary/25 hover:text-text-brand dark:text-white/85 dark:hover:text-primary-light"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      ) : null}
    </div>
  );
}
