import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type DeltaTone = "up" | "down" | "neutral";
type AccentTone = "indigo" | "orange" | "sky" | "teal";

type DashboardKpiCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  helper?: string;
  deltaText?: string;
  deltaTone?: DeltaTone;
  accentTone?: AccentTone;
};

const DELTA_TONE_CLASS: Record<DeltaTone, string> = {
  up: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  down: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  neutral: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/70",
};

const DELTA_TONE_ICON: Record<DeltaTone, ReactNode> = {
  up: <ArrowUpRight className="h-3.5 w-3.5" />,
  down: <ArrowDownRight className="h-3.5 w-3.5" />,
  neutral: <Minus className="h-3.5 w-3.5" />,
};

const ACCENT_TONE_CLASS: Record<AccentTone, string> = {
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  teal: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
};

export function DashboardKpiCard({
  label,
  value,
  icon,
  helper,
  deltaText,
  deltaTone = "neutral",
  accentTone = "teal",
}: DashboardKpiCardProps) {
  return (
    <article className="app-panel rounded-3xl border-t-2 border-t-border-light p-5 dark:border-t-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-text-primary dark:text-white/95">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            ACCENT_TONE_CLASS[accentTone],
          )}
        >
          {icon}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-text-muted">{helper}</p>
        {deltaText ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              DELTA_TONE_CLASS[deltaTone],
            )}
          >
            {DELTA_TONE_ICON[deltaTone]}
            {deltaText}
          </span>
        ) : null}
      </div>
    </article>
  );
}

