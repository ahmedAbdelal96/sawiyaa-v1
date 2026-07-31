"use client";

import React, { type ReactNode } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  CalendarClock,
  XCircle,
  Sparkles,
  Wallet,
  ShieldCheck,
  CircleDashed,
  MessageSquare,
  Headset,
  ArrowUpRight,
  Layers,
  BadgeDollarSign,
  Ticket
} from "lucide-react";

export type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "finance"
  | "session"
  | "support";

const TONE_STYLES: Record<
  Tone,
  {
    shell: string;
    value: string;
    label: string;
    hint: string;
    iconShell: string;
  }
> = {
  neutral: {
    shell: "border-slate-200/80 bg-white dark:bg-surface-secondary dark:border-white/8 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.10)]",
    value: "text-slate-800 dark:text-white/95",
    label: "text-slate-500 dark:text-white/60",
    hint: "text-slate-400 dark:text-white/45",
    iconShell: "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20",
  },
  primary: {
    shell: "border-teal-200/70 bg-white dark:bg-surface-secondary dark:border-teal-500/20 shadow-[0_2px_12px_-6px_rgba(20,150,132,0.12)]",
    value: "text-teal-800 dark:text-teal-200",
    label: "text-teal-600 dark:text-teal-400",
    hint: "text-teal-500 dark:text-teal-450",
    iconShell: "bg-teal-600 text-white ring-1 ring-teal-700/20",
  },
  success: {
    shell: "border-emerald-200/70 bg-white dark:bg-surface-secondary dark:border-emerald-500/20 shadow-[0_2px_12px_-6px_rgba(16,185,129,0.10)]",
    value: "text-emerald-800 dark:text-emerald-200",
    label: "text-emerald-600 dark:text-emerald-400",
    hint: "text-emerald-500 dark:text-emerald-450",
    iconShell: "bg-emerald-500 text-white ring-1 ring-emerald-600/20",
  },
  warning: {
    shell: "border-amber-200/70 bg-white dark:bg-surface-secondary dark:border-amber-500/20 shadow-[0_2px_12px_-6px_rgba(245,158,11,0.10)]",
    value: "text-amber-800 dark:text-amber-200",
    label: "text-amber-600 dark:text-amber-400",
    hint: "text-amber-500 dark:text-amber-450",
    iconShell: "bg-amber-500 text-white ring-1 ring-amber-600/20",
  },
  danger: {
    shell: "border-rose-200/70 bg-white dark:bg-surface-secondary dark:border-rose-500/20 shadow-[0_2px_12px_-6px_rgba(244,63,94,0.10)]",
    value: "text-rose-800 dark:text-rose-200",
    label: "text-rose-600 dark:text-rose-400",
    hint: "text-rose-500 dark:text-rose-450",
    iconShell: "bg-rose-500 text-white ring-1 ring-rose-600/20",
  },
  info: {
    shell: "border-sky-200/70 bg-white dark:bg-surface-secondary dark:border-sky-500/20 shadow-[0_2px_12px_-6px_rgba(14,165,233,0.10)]",
    value: "text-sky-800 dark:text-sky-200",
    label: "text-sky-600 dark:text-sky-400",
    hint: "text-sky-500 dark:text-sky-450",
    iconShell: "bg-sky-500 text-white ring-1 ring-sky-600/20",
  },
  finance: {
    shell: "border-indigo-200/70 bg-white dark:bg-surface-secondary dark:border-indigo-500/20 shadow-[0_2px_12px_-6px_rgba(99,102,241,0.10)]",
    value: "text-indigo-800 dark:text-indigo-200",
    label: "text-indigo-600 dark:text-indigo-400",
    hint: "text-indigo-500 dark:text-indigo-450",
    iconShell: "bg-indigo-500 text-white ring-1 ring-indigo-600/20",
  },
  session: {
    shell: "border-purple-200/70 bg-white dark:bg-surface-secondary dark:border-purple-500/20 shadow-[0_2px_12px_-6px_rgba(168,85,247,0.10)]",
    value: "text-purple-800 dark:text-purple-200",
    label: "text-purple-600 dark:text-purple-400",
    hint: "text-purple-500 dark:text-purple-450",
    iconShell: "bg-purple-500 text-white ring-1 ring-purple-600/20",
  },
  support: {
    shell: "border-orange-200/70 bg-white dark:bg-surface-secondary dark:border-orange-500/20 shadow-[0_2px_12px_-6px_rgba(249,115,22,0.10)]",
    value: "text-orange-800 dark:text-orange-200",
    label: "text-orange-600 dark:text-orange-400",
    hint: "text-orange-500 dark:text-orange-450",
    iconShell: "bg-orange-500 text-white ring-1 ring-orange-600/20",
  },
};

function getFallbackIcon({
  metricKey,
  semantic,
  tone,
  label,
}: {
  metricKey?: string;
  semantic?: string;
  tone?: string;
  label?: ReactNode;
}): ReactNode {
  const key = (metricKey || semantic || "").toLowerCase().trim();
  const labelStr = typeof label === "string" ? label.toLowerCase().trim() : "";

  if (key.includes("promo") || key.includes("coupon") || key.includes("discount")) {
    if (key.includes("active")) return <CheckCircle2 className="h-4 w-4" />;
    if (key.includes("redemption") || key.includes("use")) return <Activity className="h-4 w-4" />;
    return <Ticket className="h-4 w-4" />;
  }

  if (key.includes("session") || key.includes("calendar") || key.includes("booking")) {
    if (key.includes("upcoming") || key.includes("scheduled")) return <CalendarClock className="h-4 w-4" />;
    if (key.includes("finished") || key.includes("complete")) return <CheckCircle2 className="h-4 w-4" />;
    if (key.includes("cancel") || key.includes("rejected")) return <XCircle className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  }

  if (key.includes("support") || key.includes("ticket") || key.includes("help")) {
    if (key.includes("open") || key.includes("active")) return <Activity className="h-4 w-4" />;
    return <Headset className="h-4 w-4" />;
  }

  if (key.includes("message") || key.includes("chat") || key.includes("conversation")) {
    return <MessageSquare className="h-4 w-4" />;
  }

  if (key.includes("wallet") || key.includes("ledger") || key.includes("balance") || key.includes("earn") || key.includes("finance") || key.includes("settlement") || key.includes("paid")) {
    if (key.includes("available")) return <Wallet className="h-4 w-4" />;
    if (key.includes("pending")) return <Clock className="h-4 w-4" />;
    if (key.includes("reserved") || key.includes("security")) return <ShieldCheck className="h-4 w-4" />;
    if (key.includes("payout") || key.includes("paid") || key.includes("out")) return <ArrowUpRight className="h-4 w-4" />;
    if (key.includes("page")) return <Layers className="h-4 w-4" />;
    return <BadgeDollarSign className="h-4 w-4" />;
  }

  if (key.includes("patient") || key.includes("user") || key.includes("member")) {
    return <Users className="h-4 w-4" />;
  }

  if (tone === "finance") return <BadgeDollarSign className="h-4 w-4" />;
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "warning") return <AlertTriangle className="h-4 w-4" />;
  if (tone === "danger") return <XCircle className="h-4 w-4" />;
  if (tone === "primary") return <Sparkles className="h-4 w-4" />;
  if (tone === "support") return <Headset className="h-4 w-4" />;
  if (tone === "session") return <Calendar className="h-4 w-4" />;

  if (labelStr.includes("session") || labelStr.includes("جلسة") || labelStr.includes("جلسات")) {
    return <Calendar className="h-4 w-4" />;
  }
  if (labelStr.includes("wallet") || labelStr.includes("محفظة") || labelStr.includes("رصيد") || labelStr.includes("balance") || labelStr.includes("الصافي") || labelStr.includes("الإجمالي")) {
    return <Wallet className="h-4 w-4" />;
  }
  return <CircleDashed className="h-4 w-4" />;
}

export type PractitionerFinancialStatCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
  metricKey?: string;
  semantic?: string;
};

export function PractitionerFinancialStatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
  metricKey,
  semantic,
}: PractitionerFinancialStatCardProps) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral;
  const resolvedIcon = icon ?? getFallbackIcon({ metricKey, semantic, tone, label });

  const isLongText = typeof value === "string" && value.length > 8;
  const valueClass = isLongText
    ? "text-base font-bold sm:text-lg leading-snug"
    : "text-2xl font-bold tracking-tight sm:text-3xl";

  return (
    <div
      className={cn(
        "relative flex items-center justify-between rounded-xl border p-4 transition-all hover:shadow-sm",
        styles.shell,
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className={cn("text-xs font-medium", styles.label)}>{label}</p>
        <p className={cn(valueClass, styles.value)}>{value}</p>
        {hint ? <p className={cn("text-xs mt-1", styles.hint)}>{hint}</p> : null}
      </div>

      {resolvedIcon ? (
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.iconShell)}>
          {resolvedIcon}
        </div>
      ) : null}
    </div>
  );
}
