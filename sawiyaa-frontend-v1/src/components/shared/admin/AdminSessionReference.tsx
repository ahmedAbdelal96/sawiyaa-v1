"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AdminSessionReferenceProps = {
  sessionId: string | null | undefined;
  sessionCode: string | null | undefined;
  href?: string;
  showInternalId?: boolean;
  copyable?: boolean;
  variant?: "inline" | "table" | "detail";
  className?: string;
};

export default function AdminSessionReference({
  sessionId,
  sessionCode,
  href,
  showInternalId = false,
  copyable = false,
  variant = "inline",
  className,
}: AdminSessionReferenceProps) {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const isArabic = locale === "ar";
  const code = sessionCode?.trim() || null;
  const unavailable = isArabic ? "كود الجلسة غير متاح" : "Session Code Unavailable";
  const internalLabel = isArabic ? "معرّف الجلسة الداخلي" : "Internal Session ID";
  const copyLabel = isArabic ? "نسخ كود الجلسة" : "Copy session code";
  const copiedLabel = isArabic ? "تم نسخ كود الجلسة" : "Session code copied";

  const copyCode = async () => {
    if (!code || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const content = code ? (
    <span dir="ltr" className="font-mono tracking-tight">
      {code}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-warning-700 dark:text-warning-300">
      <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
      {unavailable}
    </span>
  );

  return (
    <span className={cn("inline-flex min-w-0 flex-col gap-1", className)}>
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-2",
          variant === "table" && "text-sm",
          variant === "detail" && "text-base font-semibold",
        )}
      >
        {href && code ? (
          <Link
            href={href as never}
            className="min-w-0 text-primary underline-offset-2 hover:underline"
            aria-label={`${isArabic ? "فتح الجلسة" : "Open session"} ${code}`}
          >
            {content}
          </Link>
        ) : (
          content
        )}
        {copyable && code ? (
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex shrink-0 rounded-md p-1 text-text-muted transition hover:bg-surface-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={copied ? copiedLabel : copyLabel}
            title={copied ? copiedLabel : copyLabel}
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        ) : null}
      </span>
      {copied ? <span className="sr-only" role="status">{copiedLabel}</span> : null}
      {showInternalId && sessionId ? (
        <span className="text-[11px] text-text-muted">
          {internalLabel}: <span dir="ltr" className="font-mono">{sessionId}</span>
        </span>
      ) : null}
    </span>
  );
}
