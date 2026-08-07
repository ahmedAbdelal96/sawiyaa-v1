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
      return "border-emerald-300 bg-emerald-100/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold";
    case "warning":
      return "border-amber-300 bg-amber-100/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 font-bold";
    case "danger":
      return "border-rose-300 bg-rose-100/80 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 font-bold";
    default:
      return "border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 font-bold";
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
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-gray-200 pb-2 dark:border-gray-800">
        <p className="text-sm font-extrabold text-gray-900 dark:text-white">{title}</p>
        <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
          {stateLabel}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{row.label}</p>
            <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{row.state}</p>
          </div>
        ))}
      </div>
      {hint ? <p className="mt-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 leading-normal">{hint}</p> : null}
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
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-950 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
        {guidance}
      </div>

      {/* Main Documents Table Section */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-4 py-3.5 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-base font-bold text-gray-900 dark:text-white">{credentialsTitle}</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
              {credentials.length}
            </span>
          </div>
        </div>

        {credentials.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">{credentialsEmpty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-sm font-bold text-gray-900 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100">
                  <th className="px-4 py-3.5 text-start font-bold">{credentialsTitle || "المستند"}</th>
                  <th className="px-4 py-3.5 text-start font-bold">{credentialDatesColumnLabel || "التواريخ"}</th>
                  <th className="px-4 py-3.5 text-start font-bold">{credentialNotesColumnLabel || "الملاحظات والرد"}</th>
                  <th className="px-4 py-3.5 text-end font-bold">{credentialActionsColumnLabel || "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {credentials.map((cred) => {
                  const isExpanded = expandedCredentialId === cred.id;
                  return (
                    <tr key={cred.id} className="group hover:bg-gray-50/80 transition-colors dark:hover:bg-gray-800/40">
                      <td colSpan={4} className="p-0">
                        <div className="flex items-center justify-between px-4 py-3.5 gap-4">
                          {/* Document Name & Status Pill */}
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                                {cred.typeLabel}
                              </p>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold mt-1",
                                  toneClassName(cred.statusTone)
                                )}
                              >
                                {cred.statusLabel}
                              </span>
                            </div>
                          </div>

                          {/* Upload / Expiry Dates */}
                          <div className="text-sm text-gray-800 dark:text-gray-200 min-w-[160px]">
                            <p className="font-bold text-gray-900 dark:text-white">{cred.uploadedAtLabel}</p>
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5">{cred.expiresAtLabel}</p>
                          </div>

                          {/* Review Note / Status Hint */}
                          <div className="text-sm text-gray-800 dark:text-gray-200 flex-1 max-w-[320px]">
                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {cred.notesValue !== "لا توجد ملاحظات" && cred.notesValue ? (
                                <span className="font-bold text-gray-900 dark:text-white">{cred.notesValue}</span>
                              ) : (
                                <span className="text-gray-600 dark:text-gray-400">{cred.reviewActionHint || "-"}</span>
                              )}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2.5 justify-end shrink-0">
                            {cred.viewUrl && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cred.onOpenFile}
                                disabled={cred.isOpeningFile}
                                startIcon={<Eye className="h-4 w-4" />}
                                className="font-bold text-sm px-3.5 py-2"
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
                                endIcon={isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                className="font-bold text-sm px-3.5 py-2"
                              >
                                {isExpanded ? closeReviewLabel : reviewCredentialLabel}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Inline Review Drawer Panel when Expanded */}
                        {cred.canReview && isExpanded && (
                          <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-3 animate-in fade-in duration-150 dark:border-gray-800 dark:bg-gray-900">
                            <textarea
                              rows={2}
                              value={cred.reviewNoteDraft}
                              onChange={(event) => cred.onReviewNoteChange(event.target.value)}
                              placeholder={cred.reviewNotePlaceholder}
                              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                            <div className="flex items-center justify-end gap-2.5">
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={cred.onApprove}
                                disabled={cred.isUpdating}
                                startIcon={<CheckCircle2 className="h-4 w-4" />}
                                className="font-bold text-sm"
                              >
                                {approveCredentialLabel}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={cred.onReject}
                                disabled={cred.isUpdating}
                                startIcon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                                className="font-bold text-sm border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/50"
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
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <p className="text-base font-bold text-gray-900 dark:text-white">{payoutTitle}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
              payoutMissing
                ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                : "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
            )}
          >
            {payoutMissing ? payoutMissingLabel : payoutProvidedLabel}
          </span>
        </div>

        {payoutRows.every((item) => item.value === "-") ? (
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{payoutEmptyLabel}</p>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {payoutRows.map((row) => (
              <div
                key={row.label}
                className="rounded-lg border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-800/40"
              >
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{row.label}</p>
                <p className="mt-1 text-base font-bold text-gray-900 dark:text-white truncate">
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
