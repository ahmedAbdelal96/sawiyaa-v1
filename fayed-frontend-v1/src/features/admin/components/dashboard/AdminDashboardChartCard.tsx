import type { ReactNode } from "react";
import { AdminDashboardSectionHeader } from "./AdminDashboardSectionHeader";

type AdminDashboardChartCardProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  children: ReactNode;
};

export function AdminDashboardChartCard({
  title,
  subtitle,
  actionLabel,
  actionHref,
  children,
}: AdminDashboardChartCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03] shadow-sm sm:p-6">
      <AdminDashboardSectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />
      <div className="mt-5">
        {children}
      </div>
    </article>
  );
}
