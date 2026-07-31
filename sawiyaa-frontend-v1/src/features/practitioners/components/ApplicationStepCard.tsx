import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export type StepCardStatus = "complete" | "warning" | "incomplete" | "neutral";

interface ApplicationStepCardProps {
  stepNumber: number;
  label: string;
  status: StepCardStatus;
  active: boolean;
  onClick: () => void;
  statusLabel: string;
  issueCount?: number;
}

export const ApplicationStepCard: React.FC<ApplicationStepCardProps> = ({
  stepNumber,
  label,
  status,
  active,
  onClick,
  statusLabel,
  issueCount = 0,
}) => {
  // Styling mappings based on status and active state
  let cardClass = "border-border-light bg-white/70 hover:bg-white text-text-secondary";
  let circleClass = "border-border-strong bg-white text-text-muted";
  let statusBadgeClass = "text-text-muted bg-gray-100";
  let compactIndicator = null;

  if (active) {
    cardClass = "border-primary/80 bg-primary-light/10 text-text-primary shadow-[0_4px_16px_rgba(36,86,79,0.06)]";
    circleClass = "border-primary bg-primary-light text-text-brand";
    statusBadgeClass = "text-primary bg-primary-light/30";
    compactIndicator = <span className="h-1.5 w-1.5 rounded-full bg-primary" />;
  } else if (status === "complete") {
    cardClass = "border-success-border bg-white text-text-primary hover:bg-white/90";
    circleClass = "border-success bg-success-soft text-status-success";
    statusBadgeClass = "text-status-success bg-success-soft";
  } else if (status === "warning") {
    cardClass = "border-status-warning-border bg-white text-text-primary hover:bg-white/90";
    circleClass = "border-status-warning bg-status-warning-soft text-status-warning";
    statusBadgeClass = "text-status-warning bg-status-warning-soft";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`practitioner-application-step-${stepNumber === 1 ? "basic" : stepNumber === 2 ? "professional" : stepNumber === 3 ? "credentials" : "paymentSubmit"}`}
      aria-current={active ? "step" : undefined}
      className={`flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3.5 text-start transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary/20 ${cardClass}`}
    >
      {/* Circle Indicator */}
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-200 ${circleClass}`}
      >
        {status === "complete" ? (
          <CheckCircle2 className="h-4.5 w-4.5" />
        ) : status === "warning" ? (
          <AlertTriangle className="h-4.5 w-4.5 animate-pulse" />
        ) : (
          stepNumber
        )}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-bold tracking-tight">{label}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {compactIndicator}
            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-tight ${statusBadgeClass}`}>
              {status === "warning" && issueCount > 0
                ? `${statusLabel} (${issueCount})`
                : statusLabel}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
