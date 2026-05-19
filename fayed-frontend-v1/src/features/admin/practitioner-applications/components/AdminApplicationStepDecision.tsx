"use client";

import { cn } from "@/lib/utils";
import type { AdminReviewDecisionReason } from "../utils/admin-review-decision";

type DecisionDisplayItem = Partial<AdminReviewDecisionReason> & {
  id?: string;
  label: string;
  helper?: string;
};

type ReviewSection = {
  key?: string;
  title: string;
  tone: "warning" | "info" | "danger" | "success";
  items: DecisionDisplayItem[];
  emptyLabel?: string;
};

type DecisionReasonDraft = {
  id: string;
  value: string;
};

type Props = {
  statusLabel?: string;
  statusDescription?: string;
  statusTone?: "success" | "warning" | "danger" | "info" | "neutral";
  sections: ReviewSection[];
  approveBlockedReasons?: string[];
  approveDisabledReasons?: Array<AdminReviewDecisionReason | string>;
  decisionNotice?: string;
  cannotApproveHint?: string;
  approveAttemptedBlocked: boolean;
  canBeReviewed: boolean;
  canBeApproved: boolean;
  canRequestChanges: boolean;
  approveNote: string;
  setApproveNote: (value: string) => void;
  requestChangeReasons: DecisionReasonDraft[];
  setRequestChangeReasons: (reasons: DecisionReasonDraft[]) => void;
  requestChangesNote: string;
  setRequestChangesNote: (value: string) => void;
  rejectReasons: DecisionReasonDraft[];
  setRejectReasons: (reasons: DecisionReasonDraft[]) => void;
  rejectNote: string;
  setRejectNote: (value: string) => void;
  requestChangesReasonError: boolean;
  rejectReasonError: boolean;
  setRequestChangesReasonError: (value: boolean) => void;
  setRejectReasonError: (value: boolean) => void;
  isApproving: boolean;
  isRequestingChanges: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  approveLabel: string;
  approveSubmittingLabel: string;
  requestChangesLabel: string;
  requestChangesSubmittingLabel: string;
  rejectLabel: string;
  rejectSubmittingLabel: string;
  approveNoteLabel: string;
  approveNotePlaceholder: string;
  requestReasonLabel: string;
  requestReasonPlaceholder: string;
  requestReasonRequired: string;
  requestReasonsHelper: string;
  addReasonLabel: string;
  removeReasonLabel: string;
  requestNotePlaceholder: string;
  rejectReasonLabel: string;
  rejectReasonPlaceholder: string;
  rejectReasonRequired: string;
  rejectReasonsHelper: string;
  rejectNotePlaceholder: string;
  debugData?: {
    applicationStatus: string;
    canBeApproved: boolean;
    canRequestChanges: boolean;
    blockersCount: number;
    blockerCodes: string[];
    credentialStatuses: Array<{ id: string; type: string; status: string }>;
    derivedDecisionGroups: Record<string, string[]>;
  } | null;
};

function sectionToneClassName(tone: ReviewSection["tone"]) {
  switch (tone) {
    case "success":
      return "border-success-200 bg-success-50/55 dark:border-success-900/30 dark:bg-success-900/10";
    case "warning":
      return "border-warning-200 bg-warning-50/55 dark:border-warning-900/30 dark:bg-warning-900/10";
    case "danger":
      return "border-red-200 bg-red-50/55 dark:border-red-900/30 dark:bg-red-900/10";
    default:
      return "border-sky-200 bg-sky-50/55 dark:border-sky-900/30 dark:bg-sky-900/10";
  }
}

function statusToneClassName(tone: Props["statusTone"]) {
  switch (tone) {
    case "success":
      return "border-success-200 bg-success-50 text-success-900 dark:border-success-900/40 dark:bg-success-900/10 dark:text-success-100";
    case "danger":
      return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-100";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-900/10 dark:text-sky-100";
    case "neutral":
      return "border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-100";
    default:
      return "border-warning-200 bg-warning-50 text-warning-900 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-100";
  }
}

function ReasonListEditor({
  title,
  helper,
  items,
  placeholder,
  addLabel,
  removeLabel,
  notePlaceholder,
  noteValue,
  onNoteChange,
  onItemsChange,
  error,
  errorLabel,
}: {
  title: string;
  helper: string;
  items: DecisionReasonDraft[];
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  notePlaceholder: string;
  noteValue: string;
  onNoteChange: (value: string) => void;
  onItemsChange: (items: DecisionReasonDraft[]) => void;
  error: boolean;
  errorLabel: string;
}) {
  const updateItem = (id: string, value: string) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      onItemsChange([{ ...items[0], value: "" }]);
      return;
    }
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    onItemsChange([...items, { id: crypto.randomUUID(), value: "" }]);
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{helper}</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          {addLabel}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "rounded-xl border bg-gray-50/70 p-3 dark:bg-gray-800/40",
              error ? "border-red-200 dark:border-red-900/40" : "border-gray-100 dark:border-gray-800",
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">#{index + 1}</p>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-xs font-medium text-red-600 transition hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
              >
                {removeLabel}
              </button>
            </div>
            <input
              type="text"
              value={item.value}
              onChange={(event) => updateItem(item.id, event.target.value)}
              placeholder={placeholder}
              className={cn(
                "w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-900 dark:text-white",
                error ? "border-red-400" : "border-gray-200 dark:border-gray-700",
              )}
            />
          </div>
        ))}
      </div>

      {error ? <p className="mt-2 text-xs text-error-500">{errorLabel}</p> : null}

      <textarea
        rows={3}
        value={noteValue}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder={notePlaceholder}
        className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
    </div>
  );
}

function DecisionReasonRow({
  item,
  highlight,
}: {
  item: DecisionDisplayItem;
  highlight: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/70 bg-white/85 p-3 dark:border-gray-800 dark:bg-gray-900/50",
        highlight && "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-900/10",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
        {item.actionLabel ? (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {item.actionLabel}
          </span>
        ) : null}
      </div>
      {item.description || item.helper ? (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{item.description ?? item.helper}</p>
      ) : null}
    </div>
  );
}

export default function AdminApplicationStepDecision(props: Props) {
  const visibleSections = props.sections.filter((section) => section.items.length > 0);
  const showDebug = process.env.NODE_ENV !== "production" && props.debugData;
  const statusTone = props.statusTone ?? (props.canBeApproved ? "success" : "warning");
  const statusLabel = props.statusLabel ?? (props.canBeApproved ? "Ready for approval" : "Approval is blocked");
  const statusDescription =
    props.statusDescription ??
    props.cannotApproveHint ??
    props.decisionNotice ??
    "";
  const disabledReasons =
    props.approveDisabledReasons?.map((reason) =>
      typeof reason === "string"
        ? { code: reason, label: reason }
        : reason,
    ) ??
    props.approveBlockedReasons?.map((reason) => ({ code: reason, label: reason })) ??
    [];

  return (
    <div className="space-y-4">
      <div className={cn("rounded-2xl border p-4", statusToneClassName(statusTone))}>
        <p className="text-sm font-semibold">{statusLabel}</p>
        {statusDescription ? <p className="mt-1 text-sm opacity-90">{statusDescription}</p> : null}
      </div>

      {visibleSections.length > 0 ? (
        <div className="space-y-3">
          {visibleSections.map((section) => (
            <div
              key={section.key ?? section.title}
              className={cn(
                "rounded-2xl border p-4",
                sectionToneClassName(section.tone),
                props.approveAttemptedBlocked &&
                  (section.tone === "warning" || section.tone === "danger" || section.tone === "info") &&
                  "ring-2 ring-red-200 dark:ring-red-900/40",
              )}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{section.title}</p>
              <div className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <DecisionReasonRow
                    key={`${section.key}-${item.code}-${item.label}`}
                    item={item}
                    highlight={
                      props.approveAttemptedBlocked &&
                      (section.tone === "warning" || section.tone === "danger" || section.tone === "info")
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!props.canBeApproved && disabledReasons.length > 0 ? (
        <div
          className={cn(
            "rounded-2xl border p-4 text-sm",
            props.approveAttemptedBlocked
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-200"
              : "border-warning-200 bg-warning-50 text-warning-900 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-200",
          )}
        >
          <p className="font-semibold">{statusTone === "success" ? statusLabel : statusDescription || statusLabel}</p>
          <div className="mt-3 space-y-2">
            {disabledReasons.map((reason) => (
              <DecisionReasonRow
                key={`disabled-${reason.code}-${reason.label}`}
                item={reason}
                highlight={props.approveAttemptedBlocked}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">{props.approveNoteLabel}</p>
          <textarea
            rows={5}
            value={props.approveNote}
            onChange={(e) => props.setApproveNote(e.target.value)}
            placeholder={props.approveNotePlaceholder}
            className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <ReasonListEditor
          title={props.requestReasonLabel}
          helper={props.requestReasonsHelper}
          items={props.requestChangeReasons}
          placeholder={props.requestReasonPlaceholder}
          addLabel={props.addReasonLabel}
          removeLabel={props.removeReasonLabel}
          notePlaceholder={props.requestNotePlaceholder}
          noteValue={props.requestChangesNote}
          onNoteChange={props.setRequestChangesNote}
          onItemsChange={(items) => {
            props.setRequestChangeReasons(items);
            if (props.requestChangesReasonError) {
              props.setRequestChangesReasonError(false);
            }
          }}
          error={props.requestChangesReasonError}
          errorLabel={props.requestReasonRequired}
        />

        <ReasonListEditor
          title={props.rejectReasonLabel}
          helper={props.rejectReasonsHelper}
          items={props.rejectReasons}
          placeholder={props.rejectReasonPlaceholder}
          addLabel={props.addReasonLabel}
          removeLabel={props.removeReasonLabel}
          notePlaceholder={props.rejectNotePlaceholder}
          noteValue={props.rejectNote}
          onNoteChange={props.setRejectNote}
          onItemsChange={(items) => {
            props.setRejectReasons(items);
            if (props.rejectReasonError) {
              props.setRejectReasonError(false);
            }
          }}
          error={props.rejectReasonError}
          errorLabel={props.rejectReasonRequired}
        />
      </div>

      {!props.canBeReviewed ? (
        <div className="rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-900 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-200">
          {props.statusDescription}
        </div>
      ) : null}

      {showDebug ? (
        <details className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 p-4 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
          <summary className="cursor-pointer font-semibold">Debug</summary>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap">{JSON.stringify(props.debugData, null, 2)}</pre>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!props.canBeApproved || props.isApproving}
          onClick={props.onApprove}
          className="inline-flex items-center rounded-xl bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.isApproving ? props.approveSubmittingLabel : props.approveLabel}
        </button>
        <button
          type="button"
          disabled={!props.canRequestChanges || props.isRequestingChanges}
          onClick={props.onRequestChanges}
          className="inline-flex items-center rounded-xl bg-orange-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.isRequestingChanges ? props.requestChangesSubmittingLabel : props.requestChangesLabel}
        </button>
        <button
          type="button"
          disabled={props.isRejecting}
          onClick={props.onReject}
          className="inline-flex items-center rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.isRejecting ? props.rejectSubmittingLabel : props.rejectLabel}
        </button>
      </div>
    </div>
  );
}
