"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type SessionCodeReferenceProps = {
  sessionId: string;
  sessionCode: string | null | undefined;
  href?: string;
  copyable?: boolean;
  showLabel?: boolean;
  variant?: "inline" | "card" | "detail" | "confirmation";
  className?: string;
};

/** Public Patient/Practitioner session reference. UUID is intentionally never rendered. */
export default function SessionCodeReference({ sessionCode, href, copyable = false, showLabel = false, variant = "inline", className }: SessionCodeReferenceProps) {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const code = sessionCode?.trim() || null;
  const isArabic = locale === "ar";
  const label = isArabic ? "كود الجلسة" : "Session Code";
  const unavailable = isArabic ? "كود الجلسة غير متاح" : "Session Code Unavailable";
  const copyLabel = isArabic ? "نسخ كود الجلسة" : "Copy session code";
  const copiedLabel = isArabic ? "تم نسخ كود الجلسة" : "Session code copied";
  const openLabel = isArabic ? "فتح تفاصيل الجلسة" : "Open session details";
  const copyCode = async () => {
    if (!code || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const reference = code ? <span dir="ltr" className="font-mono tracking-tight whitespace-nowrap">{code}</span> : <span className="inline-flex items-center gap-1.5 text-warning-700 dark:text-warning-300"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />{unavailable}</span>;
  return <span className={cn("inline-flex min-w-0 flex-col gap-1", className)}>
    {showLabel ? <span className="text-xs text-text-muted">{label}</span> : null}
    <span className={cn("inline-flex min-w-0 items-center gap-2", variant === "card" && "rounded-xl border border-border-light bg-surface-secondary px-3 py-2", variant === "detail" && "text-base font-semibold", variant === "confirmation" && "text-lg font-bold")}>
      {href && code ? <Link href={href as never} aria-label={`${openLabel} ${code}`} className="text-primary underline-offset-2 hover:underline">{reference}</Link> : reference}
      {copyable && code ? <button type="button" onClick={copyCode} aria-label={copied ? copiedLabel : copyLabel} title={copied ? copiedLabel : copyLabel} className="inline-flex shrink-0 rounded-md p-1 text-text-muted transition hover:bg-surface-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}</button> : null}
    </span>
    {copied ? <span className="sr-only" role="status">{copiedLabel}</span> : null}
  </span>;
}
