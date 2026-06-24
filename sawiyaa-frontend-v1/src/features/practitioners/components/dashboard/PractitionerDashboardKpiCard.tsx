import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type DeltaTone = "up" | "down" | "neutral";
type AccentTone = "indigo" | "sky" | "teal" | "orange";

type AccentToneStyle = {
  iconShell: string;
  icon: string;
};

type PractitionerDashboardKpiCardProps = {
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
  neutral: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70",
};

const DELTA_TONE_ICON: Record<DeltaTone, ReactNode> = {
  up: <ArrowUpRight className="h-3 w-3" />,
  down: <ArrowDownRight className="h-3 w-3" />,
  neutral: <Minus className="h-3 w-3" />,
};

const ACCENT_TONE_CLASS: Record<AccentTone, AccentToneStyle> = {
  indigo: {
    iconShell: "bg-indigo-50 dark:bg-indigo-500/10",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  sky: {
    iconShell: "bg-sky-50 dark:bg-sky-500/10",
    icon: "text-sky-600 dark:text-sky-400",
  },
  teal: {
    iconShell: "bg-teal-50 dark:bg-teal-500/10",
    icon: "text-teal-600 dark:text-teal-400",
  },
  orange: {
    iconShell: "bg-orange-50 dark:bg-orange-500/10",
    icon: "text-orange-600 dark:text-orange-400",
  },
};

export function PractitionerDashboardKpiCard({
  label,
  value,
  icon,
  helper,
  deltaText,
  deltaTone = "neutral",
  accentTone = "teal",
}: PractitionerDashboardKpiCardProps) {
  const accentStyles = ACCENT_TONE_CLASS[accentTone];

  return (
    <article className="flex flex-col justify-between rounded-3xl border border-slate-200/70 bg-white p-4 dark:border-white/5 dark:bg-white/[0.03] shadow-sm hover:shadow-md transition duration-200 min-h-[104px] sm:min-h-[112px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted dark:text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-text-primary dark:text-white/95">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            accentStyles.iconShell,
            accentStyles.icon,
          )}
        >
          {icon}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {deltaText ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
              DELTA_TONE_CLASS[deltaTone],
            )}
          >
            {DELTA_TONE_ICON[deltaTone]}
            {deltaText}
          </span>
        ) : (
          <span className="h-3" />
        )}

        {helper ? (
          <p className="max-w-[18ch] truncate text-[10px] text-text-secondary dark:text-slate-400" title={helper}>
            {helper}
          </p>
        ) : null}
      </div>
    </article>
  );
}
