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
    <article className="app-panel rounded-3xl p-5">
      <AdminDashboardSectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />
      <div className="rounded-2xl border border-border-light/90 bg-surface p-3 dark:border-white/10 dark:bg-white/[0.03]">
        {children}
      </div>
    </article>
  );
}
