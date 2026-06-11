import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type DeltaTone = "up" | "down" | "neutral";
type AccentTone = "teal" | "blue" | "amber" | "violet";

type AccentToneStyle = {
  shell: string;
  glow: string;
  iconShell: string;
  icon: string;
};

type AdminDashboardKpiCardProps = {
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

const ACCENT_TONE_CLASS: Record<AccentTone, AccentToneStyle> = {
  teal: {
    shell: "bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 shadow-sm",
    glow: "bg-primary/5 dark:bg-primary/10",
    iconShell: "bg-primary-light/50 dark:bg-primary/15",
    icon: "text-primary dark:text-primary-light",
  },
  blue: {
    shell: "bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 shadow-sm",
    glow: "bg-sky-400/5 dark:bg-sky-500/10",
    iconShell: "bg-sky-50 dark:bg-sky-500/15",
    icon: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    shell: "bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 shadow-sm",
    glow: "bg-amber-300/10 dark:bg-amber-500/10",
    iconShell: "bg-amber-50 dark:bg-amber-500/15",
    icon: "text-amber-600 dark:text-amber-400",
  },
  violet: {
    shell: "bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 shadow-sm",
    glow: "bg-violet-300/10 dark:bg-violet-500/10",
    iconShell: "bg-violet-50 dark:bg-violet-500/15",
    icon: "text-violet-600 dark:text-violet-400",
  },
};

export function AdminDashboardKpiCard({
  label,
  value,
  icon,
  helper,
  deltaText,
  deltaTone = "neutral",
  accentTone = "teal",
}: AdminDashboardKpiCardProps) {
  const accentStyles = ACCENT_TONE_CLASS[accentTone];

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl px-5 py-5 sm:px-6 transition hover:shadow-md",
        accentStyles.shell,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {label}
          </p>
          <p className="mt-3 text-[1.85rem] font-bold tracking-tight tabular-nums text-text-primary dark:text-white/95 sm:text-[2rem]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            accentStyles.iconShell,
            accentStyles.icon,
          )}
        >
          {icon}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {deltaText ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              DELTA_TONE_CLASS[deltaTone],
            )}
          >
            {DELTA_TONE_ICON[deltaTone]}
            {deltaText}
          </span>
        ) : <span className="h-5" />}

        {helper ? <p className="max-w-[30ch] text-xs leading-5 text-text-secondary">{helper}</p> : null}
      </div>
    </article>
  );
}
