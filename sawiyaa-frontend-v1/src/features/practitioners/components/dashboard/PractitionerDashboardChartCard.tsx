import type { ReactNode } from "react";
import { PractitionerDashboardSectionHeader } from "./PractitionerDashboardSectionHeader";

type PractitionerDashboardChartCardProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  children: ReactNode;
};

export function PractitionerDashboardChartCard({
  title,
  subtitle,
  actionLabel,
  actionHref,
  children,
}: PractitionerDashboardChartCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-white/5 dark:bg-white/[0.03] shadow-sm sm:p-6">
      <PractitionerDashboardSectionHeader
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
