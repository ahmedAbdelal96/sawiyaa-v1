import type { ReactNode } from "react";

export function formatAdminNotificationDateTime(iso: string | null, locale: string) {
  if (!iso) return "—";

  return new Date(iso).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "ar",
  });
}

export function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[22px] bg-surface-secondary px-4 py-3 dark:bg-white/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-text-primary dark:text-white/90">
        {value}
      </div>
    </div>
  );
}
