"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Pencil, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { hasPermission, PermissionKey } from "@/lib/auth/permissions";
import { API_BASE_URL } from "@/config/api";
import {
  approveManualPayment,
  createManualPaymentMethod,
  listManualPaymentMethods,
  listManualPaymentSubmissions,
  rejectManualPayment,
  setManualPaymentMethodEnabled,
  updateManualPaymentMethod,
} from "../api/manual-payments.api";
import type {
  ManualAdminMethod,
  ManualAdminMethodInput,
  ManualAdminSubmission,
} from "../api/manual-payments.api";

type Mode = "review" | "configuration";

type Props = {
  mode?: Mode;
  embedded?: boolean;
};

const EMPTY_METHOD: ManualAdminMethodInput = {
  code: "",
  type: "CUSTOM",
  displayNameAr: "",
  displayNameEn: "",
  accountHolderName: "",
  accountIdentifier: "",
  instructionsAr: "",
  instructionsEn: "",
  availabilityMode: "ALL",
  countryIsoCodes: [],
  isEnabled: false,
  sortOrder: 0,
};

export default function AdminManualPaymentsScreen({
  mode = "review",
  embedded = false,
}: Props) {
  const t = useTranslations("admin-manual-payments");
  const locale = useLocale();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const canManageMethods = hasPermission(
    permissionData ? { permissions: permissionData.permissions } : null,
    PermissionKey.MANUAL_PAYMENTS_METHODS_MANAGE,
  );
  const [methods, setMethods] = useState<ManualAdminMethod[]>([]);
  const [submissions, setSubmissions] = useState<ManualAdminSubmission[]>([]);
  const [editor, setEditor] = useState<ManualAdminMethodInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      if (mode === "configuration") {
        setMethods(await listManualPaymentMethods());
      } else {
        setSubmissions(await listManualPaymentSubmissions());
      }
      setError(null);
    } catch {
      setError(t("loadFailed"));
    }
  }, [mode, t]);

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]);

  const saveMethod = async () => {
    if (!editor) return;
    try {
      const payload = {
        ...editor,
        countryIsoCodes:
          editor.availabilityMode === "SELECTED"
            ? editor.countryIsoCodes
                .filter(Boolean)
                .map((value) => value.trim().toUpperCase())
            : [],
      };
      if (editingId) {
        await updateManualPaymentMethod(editingId, payload);
      } else {
        await createManualPaymentMethod(payload);
      }
      setEditor(null);
      setEditingId(null);
      await refresh();
    } catch {
      setError(t("actionFailed"));
    }
  };

  const review = async (
    submission: ManualAdminSubmission,
    action: "approve" | "reject",
  ) => {
    try {
      if (action === "approve") {
        if (!window.confirm(t("approveConfirm"))) return;
        await approveManualPayment(submission.id);
      } else {
        const reason = window.prompt(t("rejectReason"));
        if (!reason?.trim()) return;
        await rejectManualPayment(submission.id, reason.trim());
      }
      await refresh();
    } catch {
      setError(t("actionFailed"));
    }
  };

  const proofBaseUrl = `${API_BASE_URL.replace(/\/$/, "")}/manual-payments`;
  const editorTitle = useMemo(
    () => (editingId ? t("editMethod") : t("newMethod")),
    [editingId, t],
  );
  const methodName = (method: ManualAdminMethod) =>
    locale === "ar" ? method.displayNameAr : method.displayNameEn;

  const methodsSection = (
    <section
      className={
        embedded
          ? "space-y-4"
          : "rounded-2xl border border-border-light bg-white p-5"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary">{t("methods")}</h2>
        {canManageMethods ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setEditor({ ...EMPTY_METHOD });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {t("addMethod")}
          </button>
        ) : null}
      </div>
      {editor ? (
        <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 md:grid-cols-2">
          <h3 className="text-sm font-bold text-text-primary md:col-span-2">
            {editorTitle}
          </h3>
          {(
            [
              "code",
              "displayNameAr",
              "displayNameEn",
              "accountHolderName",
              "accountIdentifier",
              "instructionsAr",
              "instructionsEn",
            ] as const
          ).map((field) => (
            <label
              key={field}
              className="block text-xs font-semibold text-text-secondary"
            >
              {t(field)}
              <input
                value={editor[field] ?? ""}
                onChange={(event) =>
                  setEditor({ ...editor, [field]: event.target.value })
                }
                className="mt-1 h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm"
              />
            </label>
          ))}
          <label className="block text-xs font-semibold text-text-secondary">
            {t("type")}
            <select
              value={editor.type}
              onChange={(event) =>
                setEditor({ ...editor, type: event.target.value })
              }
              className="mt-1 h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm"
            >
              {["INSTAPAY", "PAYPAL", "ELECTRONIC_WALLET", "CUSTOM"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label className="block text-xs font-semibold text-text-secondary">
            {t("availability")}
            <select
              value={editor.availabilityMode}
              onChange={(event) =>
                setEditor({
                  ...editor,
                  availabilityMode: event.target.value,
                  countryIsoCodes:
                    event.target.value === "ALL"
                      ? []
                      : editor.countryIsoCodes,
                })
              }
              className="mt-1 h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm"
            >
              <option>ALL</option>
              <option>SELECTED</option>
            </select>
          </label>
          {editor.availabilityMode === "SELECTED" ? (
            <label className="block text-xs font-semibold text-text-secondary">
              {t("countries")}
              <input
                value={editor.countryIsoCodes.join(", ")}
                onChange={(event) =>
                  setEditor({
                    ...editor,
                    countryIsoCodes: event.target.value.split(","),
                  })
                }
                placeholder="EG, SA"
                className="mt-1 h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm"
              />
            </label>
          ) : null}
          <label className="block text-xs font-semibold text-text-secondary">
            {t("sortOrder")}
            <input
              type="number"
              value={editor.sortOrder}
              onChange={(event) =>
                setEditor({
                  ...editor,
                  sortOrder: Number(event.target.value) || 0,
                })
              }
              className="mt-1 h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary md:col-span-2">
            <input
              type="checkbox"
              checked={editor.isEnabled}
              onChange={(event) =>
                setEditor({ ...editor, isEnabled: event.target.checked })
              }
            />
            {t("enabled")}
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => void saveMethod()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setEditor(null)}
              className="rounded-lg border border-border-light px-4 py-2 text-sm font-semibold"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {methods.map((method) => (
          <div
            key={method.id}
            className="rounded-xl border border-border-light p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <strong>{methodName(method)}</strong>
              <span
                className={
                  method.isEnabled ? "text-success-600" : "text-text-muted"
                }
              >
                {method.isEnabled ? t("enabled") : t("disabled")}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              {method.accountHolderName} ·{" "}
              <span dir="ltr">{method.accountIdentifier}</span>
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {method.type} · {method.availabilityMode}
              {method.countryIsoCodes.length
                ? ` · ${method.countryIsoCodes.join(", ")}`
                : ""}
            </p>
            {canManageMethods ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(method.id);
                    setEditor({ ...method });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-xs font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("edit")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void setManualPaymentMethodEnabled(
                      method.id,
                      !method.isEnabled,
                    )
                      .then(refresh)
                      .catch(() => setError(t("actionFailed")))
                  }
                  className="rounded-lg border border-border-light px-3 py-2 text-xs font-semibold"
                >
                  {method.isEnabled ? t("disable") : t("enable")}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );

  const queueSection = (
    <section className="rounded-2xl border border-border-light bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">{t("queue")}</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-sm font-semibold text-primary"
        >
          {t("refresh")}
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {submissions.map((submission) => (
          <article
            key={submission.id}
            className="rounded-xl border border-border-light p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <strong>{submission.payer ?? t("unknownPayer")}</strong>
                <p className="mt-1 text-sm text-text-secondary">
                  {submission.program
                    ? locale === "ar"
                      ? submission.program.titleAr
                      : submission.program.titleEn
                    : t("academy")}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {methodName(submission.method)} · {submission.amount}{" "}
                  {submission.currencyCode} · {submission.senderAccountName}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(submission.submittedAt).toLocaleString(
                    locale === "ar" ? "ar-EG" : "en-US",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className="inline-flex items-center gap-1 rounded-lg border border-border-light px-3 py-2 text-xs font-semibold"
                  href={`${proofBaseUrl}/admin/submissions/${submission.id}/proof`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("proof")}
                </a>
                {submission.status === "UNDER_REVIEW" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void review(submission, "approve")}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t("approve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void review(submission, "reject")}
                      className="inline-flex items-center gap-1 rounded-lg border border-error/20 px-3 py-2 text-xs font-semibold text-error-600"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("reject")}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {!submissions.length ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            {t("empty")}
          </p>
        ) : null}
      </div>
    </section>
  );

  if (mode === "configuration") {
    return embedded ? (
      <div>
        {error ? (
          <div className="mb-4 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error-600">
            {error}
          </div>
        ) : null}
        {methodsSection}
      </div>
    ) : (
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">
            {t("settingsTitle")}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t("settingsDescription")}
          </p>
        </header>
        {error ? (
          <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error-600">
            {error}
          </div>
        ) : null}
        {methodsSection}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{t("description")}</p>
      </header>
      {error ? (
        <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      ) : null}
      {queueSection}
    </main>
  );
}
