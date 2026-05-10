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
    shell: "bg-primary-light/55 dark:bg-primary/10",
    glow: "bg-primary/12 dark:bg-primary/18",
    iconShell: "bg-white/80 dark:bg-primary/15",
    icon: "text-text-brand dark:text-primary-light",
  },
  blue: {
    shell: "bg-sky-50/80 dark:bg-sky-500/10",
    glow: "bg-sky-400/14 dark:bg-sky-500/18",
    iconShell: "bg-white/80 dark:bg-sky-500/15",
    icon: "text-sky-700 dark:text-sky-300",
  },
  amber: {
    shell: "bg-amber-50/85 dark:bg-amber-500/10",
    glow: "bg-amber-300/28 dark:bg-amber-500/18",
    iconShell: "bg-white/80 dark:bg-amber-500/15",
    icon: "text-amber-700 dark:text-amber-300",
  },
  violet: {
    shell: "bg-violet-50/85 dark:bg-violet-500/10",
    glow: "bg-violet-300/22 dark:bg-violet-500/18",
    iconShell: "bg-white/80 dark:bg-violet-500/15",
    icon: "text-violet-700 dark:text-violet-300",
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
        "app-panel relative isolate overflow-hidden rounded-[30px] px-5 py-5 sm:px-6",
        accentStyles.shell,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full", accentStyles.glow)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-8 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full opacity-70",
          accentStyles.glow,
        )}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {label}
          </p>
          <p className="mt-3 text-[2rem] font-semibold tracking-tight tabular-nums text-text-primary dark:text-white/95 sm:text-[2.15rem]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            accentStyles.iconShell,
            accentStyles.icon,
          )}
        >
          {icon}
        </span>
      </div>

      <div className="relative z-10 mt-4 space-y-3">
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

        {helper ? <p className="max-w-[30ch] text-xs leading-5 text-text-secondary">{helper}</p> : null}
      </div>
    </article>
  );
}
