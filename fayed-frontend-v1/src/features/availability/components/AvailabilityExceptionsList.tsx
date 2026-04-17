"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DestructiveConfirmModal, FormModal } from "@/components/ui/modal";
import {
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
} from "../hooks/use-availability";
import type { AvailabilityException, AvailabilityExceptionType, MyAvailabilityData } from "../types/availability.types";

function formatUtcRange(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  return `${fmt(startsAt)} - ${fmt(endsAt)}`;
}

function localInputToIso(value: string): string {
  return value.length === 16 ? `${value}:00Z` : value;
}

function ExceptionTypeBadge({ type }: { type: AvailabilityExceptionType }) {
  const t = useTranslations("practitioner-area.availability.exceptions");
  if (type === "BLOCK") {
    return (
      <span className="inline-flex rounded-lg border border-error-200 bg-error-50 px-2.5 py-0.5 text-xs font-medium text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-300">
        {t("type.BLOCK")}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-lg border border-primary/15 bg-primary-light px-2.5 py-0.5 text-xs font-medium text-text-brand dark:border-primary/20 dark:bg-primary/10 dark:text-primary-light">
      {t("type.OPEN_EXTRA")}
    </span>
  );
}

function ExceptionRow({
  exception,
  onDelete,
  isDeleting,
}: {
  exception: AvailabilityException;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const t = useTranslations("practitioner-area.availability.exceptions");

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ExceptionTypeBadge type={exception.type} />
          <span className="text-xs text-text-secondary">
            {formatUtcRange(exception.startsAt, exception.endsAt)}
          </span>
        </div>
        {exception.reason && <p className="mt-1 text-xs text-text-muted">{exception.reason}</p>}
      </div>
      <button
        type="button"
        disabled={isDeleting}
        onClick={() => onDelete(exception.id)}
        aria-label={t("delete")}
        className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-error-500/10 dark:hover:text-error-400"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}

type AddFormState = {
  type: AvailabilityExceptionType;
  startsAt: string;
  endsAt: string;
  reason: string;
  error: string | null;
};

function AddExceptionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const t = useTranslations("practitioner-area.availability.exceptions");
  const createException = useCreateAvailabilityException();

  const [form, setForm] = useState<AddFormState>({
    type: "BLOCK",
    startsAt: "",
    endsAt: "",
    reason: "",
    error: null,
  });

  const handleSubmit = () => {
    if (!form.startsAt || !form.endsAt) {
      setForm((s) => ({ ...s, error: t("validation.datesRequired") }));
      return;
    }

    const startIso = localInputToIso(form.startsAt);
    const endIso = localInputToIso(form.endsAt);
    if (new Date(endIso) <= new Date(startIso)) {
      setForm((s) => ({ ...s, error: t("validation.endAfterStart") }));
      return;
    }

    createException.mutate(
      {
        type: form.type,
        startsAt: startIso,
        endsAt: endIso,
        reason: form.reason || undefined,
      },
      {
        onSuccess: () => {
          setForm({ type: "BLOCK", startsAt: "", endsAt: "", reason: "", error: null });
          onClose();
        },
      },
    );
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={t("addForm.heading")}
      description={t("description")}
      submitLabel={createException.isPending ? t("addForm.saving") : t("addForm.save")}
      cancelLabel={t("addForm.cancel")}
      onSubmit={handleSubmit}
      loading={createException.isPending}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("addForm.typeLabel")}
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as AvailabilityExceptionType, error: null }))}
            className="app-control px-4 py-3"
          >
            <option value="BLOCK">{t("type.BLOCK")}</option>
            <option value="OPEN_EXTRA">{t("type.OPEN_EXTRA")}</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("addForm.startsAt")}
            </label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value, error: null }))}
              className="app-control px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("addForm.endsAt")}
            </label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value, error: null }))}
              className="app-control px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("addForm.reason")}
          </label>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
            placeholder={t("addForm.reasonPlaceholder")}
            className="app-control px-4 py-3"
          />
        </div>

        {form.error ? <p className="text-xs text-error-500">{form.error}</p> : null}
        {createException.isError ? <p className="text-xs text-error-500">{t("createError")}</p> : null}
      </div>
    </FormModal>
  );
}

type Props = {
  data: MyAvailabilityData;
};

export default function AvailabilityExceptionsList({ data }: Props) {
  const t = useTranslations("practitioner-area.availability.exceptions");
  const deleteException = useDeleteAvailabilityException();
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AvailabilityException | null>(null);

  const activeExceptions = data.exceptions.filter((e) => e.isActive);

  function handleDelete(id: string) {
    deleteException.mutate(id, {
      onSuccess: () => setPendingDelete(null),
    });
  }

  return (
    <div className="rounded-2xl border border-border-light bg-white p-6 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">{t("heading")}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{t("description")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-white px-3.5 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("add")}
        </button>
      </div>

      {activeExceptions.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">{t("empty")}</p>
      ) : (
        <div className="mt-2 divide-y divide-border-light dark:divide-border-light">
          {activeExceptions.map((exc) => (
            <ExceptionRow
              key={exc.id}
              exception={exc}
              onDelete={(id) =>
                setPendingDelete(activeExceptions.find((item) => item.id === id) ?? null)
              }
              isDeleting={deleteException.isPending}
            />
          ))}
        </div>
      )}

      {deleteException.isError && <p className="mt-2 text-xs text-error-500">{t("deleteError")}</p>}

      <AddExceptionModal isOpen={showAddForm} onClose={() => setShowAddForm(false)} />
      <DestructiveConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={t("delete")}
        confirmLabel={t("delete")}
        cancelLabel={t("addForm.cancel")}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
        loading={deleteException.isPending}
      >
        {pendingDelete ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
              <p className="font-medium">{formatUtcRange(pendingDelete.startsAt, pendingDelete.endsAt)}</p>
              <p className="mt-1 text-xs opacity-80">
                {t(`type.${pendingDelete.type}` as "type.BLOCK" | "type.OPEN_EXTRA")}
              </p>
              {pendingDelete.reason ? (
                <p className="mt-2 text-xs text-warning-700/80 dark:text-warning-300/80">
                  {pendingDelete.reason}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </DestructiveConfirmModal>
    </div>
  );
}
