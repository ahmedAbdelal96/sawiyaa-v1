import type { ReactNode } from "react";
import { formatEffectiveViewerDateTime } from "@/lib/time-formatting";

export function formatAdminNotificationDateTime(
  iso: string | null,
  locale: string,
  timeZone?: string | null,
) {
  if (!iso) return "—";
  return formatEffectiveViewerDateTime(iso, timeZone, { locale });
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
