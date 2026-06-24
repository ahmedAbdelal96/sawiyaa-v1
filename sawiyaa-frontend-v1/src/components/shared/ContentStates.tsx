import type { ReactNode } from "react";
import { Skeleton } from "./LoadingStates";

type StateAction = {
  label: string;
  onClick?: () => void;
  href?: ReactNode;
};

type StateCardProps = {
  icon?: ReactNode;
  title: string;
  note: string;
  action?: StateAction;
  centered?: boolean;
  className?: string;
};

export function StateCard({
  icon,
  title,
  note,
  action,
  centered = true,
  className = "",
}: StateCardProps) {
  return (
    <div
      className={`rounded-2xl border border-border-light bg-white p-6 shadow-[0_12px_32px_-24px_rgba(34,52,56,0.12)] dark:bg-surface-secondary ${className}`}
    >
      <div className={centered ? "text-center" : ""}>
        {icon ? (
          <div className={centered ? "mb-3 flex justify-center" : "mb-3"}>{icon}</div>
        ) : null}
        <p className="text-sm font-semibold text-text-primary dark:text-white/90">
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{note}</p>
        {action ? (
          action.href ? (
            <div className="mt-4">{action.href}</div>
          ) : action.onClick ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-4 inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-2 text-sm text-text-secondary shadow-theme-xs transition hover:border-primary/30 hover:bg-primary-light hover:text-primary dark:bg-surface-tertiary dark:hover:bg-surface-tertiary/80"
          >
            {action.label}
          </button>
          ) : null
        ) : null}
      </div>
    </div>
  );
}

export function ListStateSkeleton({
  items = 3,
  heightClass = "h-24",
}: {
  items?: number;
  heightClass?: string;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <Skeleton key={index} className={`${heightClass} rounded-2xl bg-surface-tertiary/80 dark:bg-white/10`} />
      ))}
    </div>
  );
}
