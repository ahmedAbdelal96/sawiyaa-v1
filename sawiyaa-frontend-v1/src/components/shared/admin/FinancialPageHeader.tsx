import type { ReactNode } from "react";
import { AdminPageHeader } from "./AdminDashboardKit";

type FinancialPageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

/**
 * Shared header contract for finance screens: name the accounting task and
 * explain when the operator should use it before showing any data or action.
 */
export default function FinancialPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: FinancialPageHeaderProps) {
  return (
    <AdminPageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
      meta={meta}
      className={className}
    />
  );
}
