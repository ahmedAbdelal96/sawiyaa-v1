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
    <article className="app-panel rounded-[30px] p-5 sm:p-6">
      <AdminDashboardSectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />
      <div className="mt-5 rounded-[24px] bg-surface-secondary/75 p-2 dark:bg-white/[0.03] sm:p-3">
        {children}
      </div>
    </article>
  );
}
