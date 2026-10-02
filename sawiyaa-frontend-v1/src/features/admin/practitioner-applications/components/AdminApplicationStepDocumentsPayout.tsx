"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, FileText, CheckCircle2, AlertCircle, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/ui/button/Button";

type CredentialRow = {
  id: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: "neutral" | "warning" | "success" | "danger";
  uploadedAtLabel: string;
  expiresAtLabel: string;
  notesLabel: string;
  notesValue: string;
  viewUrl: string | null;
  reviewNoteDraft: string;
  reviewNotePlaceholder: string;
  reviewActionHint?: string | null;
  reviewedStateLabel?: string | null;
  isUpdating?: boolean;
  onReviewNoteChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  canReview: boolean;
  onOpenFile: () => void;
  isOpeningFile?: boolean;
};

type Props = {
  identityTitle: string;
  identityHint: string;
  identityComplete: boolean;
  identityEvidenceCompleteLabel: string;
  identityEvidenceMissingLabel: string;
  identityRows: Array<{ label: string; state: string }>;
  qualificationsTitle?: string;
  qualificationsRows?: Array<{ label: string; state: string }>;
  qualificationsStateLabel?: string;
  credentialsTitle: string;
  credentialsEmpty: string;
  openFileLabel: string;
  reviewCredentialLabel: string;
  closeReviewLabel: string;
  guidance: string;
  credentials: CredentialRow[];
  approveCredentialLabel: string;
  rejectCredentialLabel: string;
  credentialStatusColumnLabel: string;
  credentialDatesColumnLabel: string;
  credentialNotesColumnLabel: string;
  credentialActionsColumnLabel: string;
  payoutTitle: string;
  payoutRows: Array<{ label: string; value: string }>;
  payoutMissing: boolean;
  payoutProvidedLabel: string;
  payoutMissingLabel: string;
  payoutEmptyLabel: string;
};

function toneClassName(tone: CredentialRow["statusTone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300";
    default:
      return "border-border-light bg-surface-secondary text-text-secondary";
  }
}

function CompactStateGrid({
  title,
  rows,
  hint,
  stateLabel,
}: {
  title: string;
  rows: Array<{ label: string; state: string }>;
  hint?: string;
  stateLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40">
      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-border-light pb-2">
        <p className="text-xs font-bold text-text-primary dark:text-white/95">{title}</p>
        <span className="inline-flex items-center rounded-full border border-border-light bg-surface-secondary px-2.5 py-0.5 text-xs font-bold text-text-secondary">
          {stateLabel}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-border-light bg-surface-secondary/30 px-3 py-2 dark:bg-surface-secondary/20"
          >
            <p className="text-[11px] font-semibold text-text-muted">{row.label}</p>
            <p className="mt-0.5 text-xs font-bold text-text-primary truncate dark:text-white/95">{row.state}</p>
          </div>
        ))}
      </div>
      {hint ? <p className="mt-2 text-xs font-medium text-text-secondary leading-relaxed">{hint}</p> : null}
    </div>
  );
}

export default function AdminApplicationStepDocumentsPayout({
  identityTitle,
  identityHint,
  identityComplete,
  identityEvidenceCompleteLabel,
  identityEvidenceMissingLabel,
  identityRows,
  qualificationsTitle,
  qualificationsRows,
  qualificationsStateLabel,
  credentialsTitle,
  credentialsEmpty,
  openFileLabel,
  reviewCredentialLabel,
  closeReviewLabel,
  guidance,
  credentials,
  approveCredentialLabel,
  rejectCredentialLabel,
  credentialStatusColumnLabel,
  credentialDatesColumnLabel,
  credentialNotesColumnLabel,
  credentialActionsColumnLabel,
  payoutTitle,
  payoutRows,
  payoutMissing,
  payoutProvidedLabel,
  payoutMissingLabel,
  payoutEmptyLabel,
}: Props) {
  const [expandedCredentialId, setExpandedCredentialId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Identity & Qualifications Summaries */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <CompactStateGrid
          title={identityTitle}
          rows={identityRows}
          hint={identityHint}
          stateLabel={identityComplete ? identityEvidenceCompleteLabel : identityEvidenceMissingLabel}
        />

        {qualificationsTitle && qualificationsRows && qualificationsRows.length > 0 ? (
          <CompactStateGrid
            title={qualificationsTitle}
            rows={qualificationsRows}
            stateLabel={qualificationsStateLabel ?? qualificationsRows[0]?.state ?? identityEvidenceMissingLabel}
          />
        ) : null}
      </div>

      {/* Guidance Banner */}
      {guidance && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-xs font-semibold text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-200">
          {guidance}
        </div>
      )}

      {/* Main Documents Table Section */}
      <div className="overflow-hidden rounded-2xl border border-border-light bg-surface shadow-2xs dark:bg-surface-secondary/40">
        <div className="flex items-center justify-between border-b border-border-light bg-surface px-4 py-3 dark:bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-text-primary dark:text-white/95">{credentialsTitle}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[10px] font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
              {credentials.length}
            </span>
          </div>
        </div>

        {credentials.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs font-semibold text-text-muted">{credentialsEmpty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-border-light bg-surface-secondary/30 text-xs font-bold text-text-secondary dark:bg-surface-secondary/20">
                  <th className="px-4 py-2.5 text-start font-bold">{credentialsTitle || "المستند"}</th>
                  <th className="px-4 py-2.5 text-start font-bold">{credentialDatesColumnLabel || "التواريخ"}</th>
                  <th className="px-4 py-2.5 text-start font-bold">{credentialNotesColumnLabel || "الملاحظات والرد"}</th>
                  <th className="px-4 py-2.5 text-end font-bold">{credentialActionsColumnLabel || "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/60">
                {credentials.map((cred) => {
                  const isExpanded = expandedCredentialId === cred.id;
                  return (
                    <tr key={cred.id} className="group hover:bg-surface-secondary/30 transition-colors">
                      <td colSpan={4} className="p-0">
                        <div className="flex flex-wrap items-center justify-between px-4 py-3 gap-3">
                          {/* Document Name & Status Pill */}
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-text-primary dark:text-white/95">
                                {cred.typeLabel}
                              </p>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-bold mt-0.5",
                                  toneClassName(cred.statusTone)
                                )}
                              >
                                {cred.statusLabel}
                              </span>
                            </div>
                          </div>

                          {/* Upload / Expiry Dates */}
                          <div className="text-xs text-text-secondary min-w-[140px]">
                            <p className="font-semibold text-text-primary dark:text-white/90">{cred.uploadedAtLabel}</p>
                            <p className="text-[11px] text-text-muted mt-0.5">{cred.expiresAtLabel}</p>
                          </div>

                          {/* Review Note / Status Hint */}
                          <div className="text-xs text-text-secondary flex-1 max-w-[300px]">
                            <p className="truncate text-xs font-medium text-text-secondary">
                              {cred.notesValue !== "لا توجد ملاحظات" && cred.notesValue ? (
                                <span className="font-bold text-text-primary dark:text-white/90">{cred.notesValue}</span>
                              ) : (
                                <span className="text-text-muted">{cred.reviewActionHint || "-"}</span>
                              )}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 justify-end shrink-0">
                            {cred.viewUrl && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cred.onOpenFile}
                                disabled={cred.isOpeningFile}
                                startIcon={<Eye className="h-3.5 w-3.5" />}
                                className="text-xs px-3 py-1.5"
                              >
                                {cred.isOpeningFile ? "..." : openFileLabel}
                              </Button>
                            )}
                            {cred.canReview && (
                              <Button
                                type="button"
                                variant={isExpanded ? "secondary" : "primary"}
                                size="sm"
                                onClick={() => setExpandedCredentialId(isExpanded ? null : cred.id)}
                                endIcon={isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                className="text-xs px-3 py-1.5 font-bold"
                              >
                                {isExpanded ? closeReviewLabel : reviewCredentialLabel}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Inline Review Drawer Panel when Expanded */}
                        {cred.canReview && isExpanded && (
                          <div className="bg-surface-secondary/20 border-t border-border-light p-3.5 space-y-2.5 animate-in fade-in duration-150">
                            <textarea
                              rows={2}
                              value={cred.reviewNoteDraft}
                              onChange={(event) => cred.onReviewNoteChange(event.target.value)}
                              placeholder={cred.reviewNotePlaceholder}
                              className="w-full rounded-xl border border-border-light bg-surface px-3 py-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={cred.onApprove}
                                disabled={cred.isUpdating}
                                startIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                className="text-xs font-bold"
                              >
                                {approveCredentialLabel}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={cred.onReject}
                                disabled={cred.isUpdating}
                                startIcon={<AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                                className="text-xs font-bold border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                              >
                                {rejectCredentialLabel}
                              </Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Details Compact Card */}
      <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border-light pb-2.5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold text-text-primary dark:text-white/95">{payoutTitle}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
              payoutMissing
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            )}
          >
            {payoutMissing ? payoutMissingLabel : payoutProvidedLabel}
          </span>
        </div>

        {payoutRows.every((item) => item.value === "-") ? (
          <p className="text-xs font-semibold text-text-muted">{payoutEmptyLabel}</p>
        ) : (
          <div className="grid gap-2.5 grid-cols-2 md:grid-cols-4">
            {payoutRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-border-light bg-surface-secondary/30 px-3 py-2 dark:bg-surface-secondary/20"
              >
                <p className="text-[11px] font-semibold text-text-muted">{row.label}</p>
                <p className="mt-0.5 text-xs font-bold text-text-primary dark:text-white/95 truncate">
                  {row.value || "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
