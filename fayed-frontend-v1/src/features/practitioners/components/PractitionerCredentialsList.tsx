"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CheckCircle2,
  ExternalLink,
  FileBadge2,
  Info,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import DateField from "@/components/form/input/DateField";
import InputField from "@/components/form/input/InputField";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { toAppError } from "@/lib/api/errors";
import {
  usePractitionerCredentials,
  usePractitionerProfile,
  useUploadPractitionerCredential,
} from "../hooks/use-practitioners";
import type { CredentialReviewStatus, CredentialType } from "../types/practitioners.types";

const statusColour: Record<CredentialReviewStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  EXPIRED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const credentialTypes: CredentialType[] = [
  "LICENSE",
  "DEGREE",
  "CERTIFICATION",
  "NATIONAL_ID",
  "PASSPORT",
  "MEMBERSHIP",
  "OTHER",
];

type UploadFormState = {
  credentialType: CredentialType;
  fileUrl: string;
  expiresAt: string;
};

const initialFormState: UploadFormState = {
  credentialType: "LICENSE",
  fileUrl: "",
  expiresAt: "",
};

function formatDate(isoString: string, locale: string) {
  return new Date(isoString).toLocaleDateString(locale);
}

type PractitionerCredentialsListProps = {
  isEditable?: boolean;
};

export default function PractitionerCredentialsList({
  isEditable = true,
}: PractitionerCredentialsListProps) {
  const t = useTranslations("practitioner-area");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = usePractitionerCredentials();

  const { data: profileData } = usePractitionerProfile();
  const uploadCredential = useUploadPractitionerCredential();

  const [form, setForm] = useState<UploadFormState>(initialFormState);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    fileUrl?: string;
  }>({});

  const credentials = data?.credentials ?? [];
  const summary = profileData?.profile.credentialSummary;

  const isReadyForSubmission = useMemo(() => {
    const totalCredentials = summary?.totalCredentials ?? credentials.length;
    return totalCredentials > 0;
  }, [credentials.length, summary?.totalCredentials]);

  const resetForm = () => {
    setForm(initialFormState);
    setFieldErrors({});
  };

  const handleUpload = async () => {
    if (!isEditable) {
      return;
    }
    const trimmedUrl = form.fileUrl.trim();

    if (!trimmedUrl) {
      setFieldErrors({
        fileUrl: t("credentials.form.validation.fileUrlRequired"),
      });
      return;
    }

    try {
      setFeedback(null);
      setFieldErrors({});

      await uploadCredential.mutateAsync({
        credentialType: form.credentialType,
        fileUrl: trimmedUrl,
        expiresAt: form.expiresAt ? form.expiresAt : null,
      });

      setFeedback({
        tone: "success",
        message: t("credentials.feedback.uploadSuccess"),
      });
      resetForm();
    } catch (error) {
      const appError = toAppError(error, {
        requestPath: "/practitioners/me/credentials",
      });

      if (appError.code === "PRACTITIONER_CREDENTIAL_ALREADY_EXISTS") {
        setFeedback({
          tone: "error",
          message: t("credentials.feedback.duplicateError"),
        });
        return;
      }

      setFeedback({
        tone: "error",
        message: t("credentials.feedback.uploadError"),
      });
    }
  };

  if (isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-28" />;
  }

  if (isError || !data) {
    return (
      <StateCard
        icon={<TriangleAlert className="h-8 w-8 text-red-500" />}
        title={t("credentials.feedback.loadError")}
        note={t("credentials.feedback.loadErrorNote")}
        action={{
          label: t("credentials.feedback.retry"),
          onClick: () => refetch(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!isEditable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-300">
          {t("application.statusMessage.UNDER_REVIEW")}
        </div>
      ) : null}
      <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary-light p-2.5 text-text-brand dark:bg-primary/15 dark:text-primary-light">
            <Info className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("credentials.management.heading")}
            </p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("credentials.management.note")}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              {t("credentials.management.scopeNote")}
            </p>
          </div>
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-700/30 dark:bg-green-900/10 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileBadge2 className="h-4 w-4 text-primary dark:text-primary-light" />
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("credentials.current.heading")}
            </h2>
          </div>

          {credentials.length === 0 ? (
            <StateCard
              icon={<ShieldCheck className="h-8 w-8 text-text-muted" />}
              title={t("credentials.emptyTitle")}
              note={t("credentials.empty")}
              centered={false}
              className="p-5"
            />
          ) : (
            <div className="space-y-3">
              {credentials.map((cred) => (
                <div
                  key={cred.credentialId}
                  className="rounded-2xl border border-border-light bg-surface-primary p-4 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary dark:text-white/90">
                          {t(`credentials.type.${cred.credentialType}`)}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            statusColour[cred.reviewStatus]
                          }`}
                        >
                          {t(`credentials.status.${cred.reviewStatus}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("credentials.uploadedOn", {
                          date: formatDate(cred.uploadedAt, dateLocale),
                        })}
                        {" "}
                        <span aria-hidden>&middot;</span>
                        {" "}
                        {cred.expiresAt
                          ? t("credentials.expiresOn", {
                              date: formatDate(cred.expiresAt, dateLocale),
                            })
                          : t("credentials.noExpiry")}
                      </p>
                    </div>

                    <a
                      href={cred.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border-light px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t("credentials.actions.openReference")}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary dark:text-primary-light" />
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
                {t("credentials.summary.heading")}
              </h2>
            </div>

            <dl className="space-y-2 text-sm text-text-secondary">
              <div className="flex items-center justify-between gap-3">
                <dt>{t("credentials.summary.total")}</dt>
                <dd className="font-semibold text-text-primary dark:text-white/90">
                  {summary?.totalCredentials ?? credentials.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{t("credentials.summary.pending")}</dt>
                <dd className="font-semibold text-text-primary dark:text-white/90">
                  {summary?.pendingCount ?? credentials.filter((item) => item.reviewStatus === "PENDING").length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{t("credentials.summary.approved")}</dt>
                <dd className="font-semibold text-text-primary dark:text-white/90">
                  {summary?.approvedCount ?? credentials.filter((item) => item.reviewStatus === "APPROVED").length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{t("credentials.summary.rejected")}</dt>
                <dd className="font-semibold text-text-primary dark:text-white/90">
                  {summary?.rejectedCount ?? credentials.filter((item) => item.reviewStatus === "REJECTED").length}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-6 text-text-secondary">
              {isReadyForSubmission
                ? t("credentials.summary.readyNote")
                : t("credentials.summary.missingNote")}
            </p>
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-primary p-5 dark:bg-white/5">
            <div className="mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary dark:text-primary-light" />
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">
                {t("credentials.form.heading")}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="credential-type"
                  className="mb-2 block text-xs font-medium text-text-secondary"
                >
                  {t("credentials.form.typeLabel")}
                </label>
                <select
                  id="credential-type"
                  value={form.credentialType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      credentialType: event.target.value as CredentialType,
                    }))
                  }
                  disabled={!isEditable}
                  className="h-11 w-full rounded-xl border border-border-light bg-surface-secondary px-4 py-2.5 text-sm text-text-primary outline-none transition focus:border-border-focus focus:ring-3 focus:ring-primary/10 dark:bg-surface-secondary dark:text-white/90"
                >
                  {credentialTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`credentials.type.${type}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="credential-file-url"
                  className="mb-2 block text-xs font-medium text-text-secondary"
                >
                  {t("credentials.form.fileUrlLabel")}
                </label>
                <InputField
                  id="credential-file-url"
                  type="url"
                  value={form.fileUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fileUrl: event.target.value,
                    }))
                  }
                  placeholder={t("credentials.form.fileUrlPlaceholder")}
                  disabled={!isEditable}
                  error={Boolean(fieldErrors.fileUrl)}
                  hint={fieldErrors.fileUrl ?? t("credentials.form.fileUrlHint")}
                />
              </div>

              <div>
                <DateField
                  label={t("credentials.form.expiresAtLabel")}
                  placeholder={t("credentials.form.expiresAtPlaceholder")}
                  value={form.expiresAt}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      expiresAt: value,
                    }))
                  }
                  disabled={!isEditable}
                />
              </div>

              <div className="rounded-2xl border border-dashed border-border-light px-4 py-3 text-xs leading-6 text-text-secondary dark:border-white/10">
                <p>{t("credentials.form.scopeNote")}</p>
                <p className="mt-1 text-text-muted">{t("credentials.form.duplicateNote")}</p>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadCredential.isPending || !isEditable}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadCredential.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("credentials.actions.uploading")}
                  </>
                ) : (
                  t("credentials.actions.upload")
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
