"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { BookOpen, ChevronDown } from "lucide-react";
import { SurfaceCard } from "@/components/shared/SurfaceShell";

type HelpSection = {
  heading?: string;
  items: string[];
};

type CollapsibleHelpCenterProps = {
  title: string;
  summary?: string;
  sections: HelpSection[];
  defaultExpanded?: boolean;
};

export default function CollapsibleHelpCenter({
  title,
  summary,
  sections,
  defaultExpanded = false,
}: CollapsibleHelpCenterProps) {
  const locale = useLocale();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const expandLabel = locale.startsWith("ar") ? "إظهار الإرشادات" : "Show guidance";
  const collapseLabel = locale.startsWith("ar") ? "إخفاء الإرشادات" : "Hide guidance";

  return (
    <SurfaceCard as="section" variant="compact">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-start"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {title}
            </p>
            {summary ? (
              <p className="mt-0.5 truncate text-xs text-text-muted">{summary}</p>
            ) : null}
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-surface-secondary">
          {expanded ? collapseLabel : expandLabel}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {expanded ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {sections.map((section, index) => (
            <div
              key={`${section.heading ?? "help"}-${index}`}
              className="rounded-2xl border border-border-light bg-white px-4 py-3 dark:bg-surface-secondary"
            >
              {section.heading ? (
                <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                  {section.heading}
                </h3>
              ) : null}
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-text-secondary">
                {section.items.map((item, itemIndex) => (
                  <li key={`${item}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
