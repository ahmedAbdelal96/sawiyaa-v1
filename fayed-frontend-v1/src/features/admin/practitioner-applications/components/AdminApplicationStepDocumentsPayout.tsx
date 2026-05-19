"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type CredentialRow = {
  id: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: "neutral" | "warning" | "success" | "danger";
  uploadedAtLabel: string;
  expiresAtLabel: string;
  notesLabel: string;
  notesValue: string;
  fileUrl: string | null;
  reviewNoteDraft: string;
  reviewNotePlaceholder: string;
  reviewActionHint?: string | null;
  reviewedStateLabel?: string | null;
  isUpdating?: boolean;
  onReviewNoteChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  canReview: boolean;
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
      return "border-success-200 bg-success-50 text-success-700 dark:border-success-900/40 dark:bg-success-900/10 dark:text-success-200";
    case "warning":
      return "border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-100";
    case "danger":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
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
    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {stateLabel}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-gray-100 bg-surface-secondary/70 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{row.label}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{row.state}</p>
          </div>
        ))}
      </div>
      {hint ? <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">{hint}</p> : null}
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

      <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-900/10 dark:text-sky-100">
        {guidance}
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{credentialsTitle}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {credentials.length === 0 ? credentialsEmpty : `${credentials.length}`}
              </p>
            </div>
          </div>

          {credentials.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">{credentialsEmpty}</div>
          ) : (
            <div className="space-y-3 p-4">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="rounded-2xl border border-gray-100 bg-surface-secondary/60 p-4 dark:border-gray-800 dark:bg-gray-800/30"
                >
                  {(() => {
                    const isExpanded = expandedCredentialId === cred.id;
                    return (
                      <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{cred.typeLabel}</p>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                          toneClassName(cred.statusTone),
                        )}
                      >
                        {cred.statusLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {cred.fileUrl ? (
                        <a
                          href={cred.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                        >
                          {openFileLabel}
                        </a>
                      ) : null}
                      {cred.canReview ? (
                        <button
                          type="button"
                          onClick={() => setExpandedCredentialId(isExpanded ? null : cred.id)}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                        >
                          {isExpanded ? closeReviewLabel : reviewCredentialLabel}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-gray-100 bg-white/80 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{credentialStatusColumnLabel}</p>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{cred.reviewActionHint ?? "-"}</p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white/80 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{credentialDatesColumnLabel}</p>
                      <div className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                        <p>{cred.uploadedAtLabel}</p>
                        <p>{cred.expiresAtLabel}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white/80 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{credentialNotesColumnLabel}</p>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                        {cred.notesLabel}: {cred.notesValue}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white/80 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{credentialActionsColumnLabel}</p>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{cred.reviewedStateLabel ?? "-"}</p>
                    </div>
                  </div>

                  {cred.canReview && isExpanded ? (
                    <div className="mt-3 rounded-xl border border-gray-100 bg-white/80 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                      <textarea
                        rows={3}
                        value={cred.reviewNoteDraft}
                        onChange={(event) => cred.onReviewNoteChange(event.target.value)}
                        placeholder={cred.reviewNotePlaceholder}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={cred.onApprove}
                          disabled={cred.isUpdating}
                          className="inline-flex items-center justify-center rounded-xl bg-success-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {approveCredentialLabel}
                        </button>
                        <button
                          type="button"
                          onClick={cred.onReject}
                          disabled={cred.isUpdating}
                          className="inline-flex items-center justify-center rounded-xl bg-warning-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-warning-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {rejectCredentialLabel}
                        </button>
                      </div>
                    </div>
                  ) : null}
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{payoutTitle}</p>
            <span
              className={
                payoutMissing
                  ? "inline-flex items-center rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-800 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-100"
                  : "inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              }
            >
              {payoutMissing ? payoutMissingLabel : payoutProvidedLabel}
            </span>
          </div>
          {payoutRows.every((item) => item.value === "-") ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{payoutEmptyLabel}</p>
          ) : (
            <div className="space-y-2">
              {payoutRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-surface-secondary/70 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{row.label}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
