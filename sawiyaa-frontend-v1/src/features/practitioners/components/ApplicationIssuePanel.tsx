import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getPractitionerApplicationIssueCopy } from "./practitioner-application-issue-copy";

export type ApplicationIssue = {
  stepKey: string;
  code: string;
  severity: "BLOCKER" | "WARNING" | "INFO";
  field?: string;
};

interface ApplicationIssuePanelProps {
  issues: ApplicationIssue[];
  t: (key: string) => string;
  locale: string;
}

export const ApplicationIssuePanel: React.FC<ApplicationIssuePanelProps> = ({
  issues,
  t,
  locale,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (issues.length === 0) return null;

  const handleIssueClick = (code: string) => {
    const map: Record<string, string> = {
      BASIC_PROFILE_DISPLAY_NAME_MISSING: "display-name",
      BASIC_PROFILE_COUNTRY_MISSING: "wizard-country-container",
      PROFESSIONAL_DETAILS_TITLE_MISSING: "professional-title",
      PROFESSIONAL_DETAILS_BIO_MISSING: "bio",
      PROFESSIONAL_DETAILS_YEARS_MISSING: "years-of-experience",
      PROFESSIONAL_DETAILS_LANGUAGE_MISSING: "wizard-languages-container",
      PROFESSIONAL_DETAILS_SPECIALTY_MISSING: "specialty-category",
      PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING: "specialty-category",
    };
    const id = map[code];
    if (!id) return;

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const input =
        element.tagName === "INPUT" ||
        element.tagName === "SELECT" ||
        element.tagName === "TEXTAREA"
          ? element
          : (element.querySelector("input, select, textarea, [tabindex='0']") as HTMLElement);
      if (input) {
        input.focus();
      }
    }
  };

  const shouldCollapse = issues.length > 4;
  const displayedIssues = shouldCollapse && isCollapsed ? issues.slice(0, 4) : issues;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-status-warning-border bg-status-warning-soft/40 p-3.5 space-y-2.5 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-status-warning shrink-0" />
          <span className="text-xs font-bold text-text-primary">
            {t("application.wizard.stepIssuesTitle")}
          </span>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-warning px-1.5 text-[10px] font-bold text-white">
            {issues.length}
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-status-warning-border/25">
        {displayedIssues.map((issue) => {
          const copy = getPractitionerApplicationIssueCopy(issue.code);
          const hasTargetField = [
            "BASIC_PROFILE_DISPLAY_NAME_MISSING",
            "BASIC_PROFILE_COUNTRY_MISSING",
            "PROFESSIONAL_DETAILS_TITLE_MISSING",
            "PROFESSIONAL_DETAILS_BIO_MISSING",
            "PROFESSIONAL_DETAILS_YEARS_MISSING",
            "PROFESSIONAL_DETAILS_LANGUAGE_MISSING",
            "PROFESSIONAL_DETAILS_SPECIALTY_MISSING",
            "PROFESSIONAL_DETAILS_PRIMARY_CATEGORY_MISSING",
          ].includes(issue.code);

          const RowElement = hasTargetField ? "button" : "div";
          const rowProps = hasTargetField
            ? {
                type: "button" as const,
                onClick: () => handleIssueClick(issue.code),
                className:
                  "w-full text-start flex items-center justify-between gap-3 py-1.5 hover:bg-status-warning/5 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-status-warning/20 px-2 cursor-pointer",
              }
            : {
                className: "flex items-center justify-between gap-3 py-1.5 px-2",
              };

          return (
            <div
              key={`${issue.stepKey}-${issue.code}-${issue.field ?? "all"}`}
              className="pt-1 first:pt-0"
            >
              <RowElement {...rowProps}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-warning shrink-0" />
                  <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {t(copy.titleKey as Parameters<typeof t>[0])}
                    </span>
                    <span className="text-[11px] text-text-secondary truncate">
                      {t(copy.descriptionKey as Parameters<typeof t>[0])}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {issue.severity === "BLOCKER" && (
                    <span className="text-[9px] bg-status-danger-soft text-status-danger px-1.5 py-0.5 rounded-md font-bold tracking-tight">
                      {t("application.wizard.requiredBadge")}
                    </span>
                  )}
                  {hasTargetField && (
                    <span className="text-[10px] text-primary font-bold hover:text-primary-hover transition-colors">
                      {t("application.wizard.goToField")}
                    </span>
                  )}
                </div>
              </RowElement>
            </div>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      {shouldCollapse && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-xs font-bold text-status-warning hover:text-status-warning/80 hover:underline focus:outline-none focus:ring-2 focus:ring-status-warning/20 rounded px-2 py-0.5"
          >
            {isCollapsed
              ? locale === "ar"
                ? `عرض الكل (${issues.length})`
                : `Show all (${issues.length})`
              : locale === "ar"
                ? "عرض أقل"
                : "Show less"}
          </button>
        </div>
      )}
    </div>
  );
};
