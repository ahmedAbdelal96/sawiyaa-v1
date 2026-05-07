"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FormModal } from "@/components/ui/modal";
import {
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
} from "../hooks/use-availability";
import type { AvailabilityException, AvailabilityExceptionType, MyAvailabilityData } from "../types/availability.types";

function startOfLocalDay(offsetDays: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function buildLocalDayRange(startOffsetDays: number, endOffsetDays: number): { startsAt: string; endsAt: string } {
  return {
    startsAt: startOfLocalDay(startOffsetDays).toISOString(),
    endsAt: startOfLocalDay(endOffsetDays).toISOString(),
  };
}

function formatRange(startsAt: string, endsAt: string, timeZone: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    });
  return `${fmt(startsAt)} - ${fmt(endsAt)}`;
}

function localInputToIso(value: string): string {
  return new Date(value).toISOString();
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

function QuickActionCard({
  title,
  description,
  onClick,
  disabled,
  variant = "neutral",
}: {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "neutral" | "warning";
}) {
  const variantClass =
    variant === "warning"
      ? "border-warning-200 bg-warning-50 text-warning-900 hover:bg-warning-100 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-100"
      : "border-border-light bg-white text-text-primary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex h-full flex-col items-start gap-1.5 rounded-2xl border px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClass}`}
    >
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs leading-5 text-text-secondary dark:text-text-muted">{description}</span>
    </button>
  );
}

function ExceptionRow({
  exception,
  onDelete,
  isDeleting,
  timeZone,
}: {
  exception: AvailabilityException;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  timeZone: string;
}) {
  const t = useTranslations("practitioner-area.availability.exceptions");

  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ExceptionTypeBadge type={exception.type} />
          <span className="text-xs text-text-secondary">
            {formatRange(exception.startsAt, exception.endsAt, timeZone)}
          </span>
        </div>
        {exception.reason && <p className="mt-1 text-xs text-text-muted">{exception.reason}</p>}
      </div>
      <button
        type="button"
        disabled={isDeleting}
        onClick={() => onDelete(exception.id)}
        aria-label={t("restore")}
        className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-border-light bg-white px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-surface-tertiary dark:border-border-light dark:bg-surface-secondary dark:hover:bg-white/5"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m0 0l3-3m-3 3l3 3" />
        </svg>
        {t("restore")}
      </button>
    </div>
  );
}

type AddFormState = {
  startsAt: string;
  endsAt: string;
  reason: string;
  error: string | null;
};

function CustomBlockModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const t = useTranslations("practitioner-area.availability.exceptions");
  const createException = useCreateAvailabilityException();

  const [form, setForm] = useState<AddFormState>({
    startsAt: "",
    endsAt: "",
    reason: "",
    error: null,
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        startsAt: "",
        endsAt: "",
        reason: "",
        error: null,
      });
    }
  }, [isOpen]);

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
        type: "BLOCK",
        startsAt: startIso,
        endsAt: endIso,
        reason: form.reason || undefined,
      },
      {
        onSuccess: () => {
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
      description={t("customHint")}
      submitLabel={createException.isPending ? t("addForm.saving") : t("addForm.save")}
      cancelLabel={t("addForm.cancel")}
      onSubmit={handleSubmit}
      loading={createException.isPending}
    >
      <div className="space-y-4">
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
  const createException = useCreateAvailabilityException();
  const deleteException = useDeleteAvailabilityException();
  const [showCustomForm, setShowCustomForm] = useState(false);

  const activeExceptions = data.exceptions.filter((e) => e.isActive);
  const quickActions = [
    {
      key: "today",
      title: t("quick.today"),
      description: t("quick.todayNote"),
      onClick: () => createQuickBlock(0, 1),
    },
    {
      key: "tomorrow",
      title: t("quick.tomorrow"),
      description: t("quick.tomorrowNote"),
      onClick: () => createQuickBlock(1, 2),
    },
    {
      key: "week",
      title: t("quick.week"),
      description: t("quick.weekNote"),
      onClick: () => createQuickBlock(1, 8),
      variant: "warning" as const,
    },
  ];

  function createQuickBlock(startOffsetDays: number, endOffsetDays: number) {
    const range = buildLocalDayRange(startOffsetDays, endOffsetDays);
    createException.mutate({
      type: "BLOCK",
      startsAt: range.startsAt,
      endsAt: range.endsAt,
    });
  }

  function handleRestore(id: string) {
    deleteException.mutate(id, {
    });
  }

  return (
    <div className="rounded-2xl border border-border-light bg-white p-6 shadow-sm dark:border-border-light dark:bg-surface-secondary">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/90">{t("heading")}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{t("description")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCustomForm(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-white px-3.5 py-2 text-sm font-medium text-text-secondary hover:bg-surface-tertiary dark:bg-surface-secondary dark:hover:bg-white/5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("custom")}
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <div className="mb-2.5 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">{t("quick.heading")}</h3>
              <p className="mt-0.5 text-xs text-text-secondary">{t("quick.note")}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.key}
                title={action.title}
                description={action.description}
                onClick={action.onClick}
                disabled={createException.isPending}
                variant={action.variant}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2.5 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">{t("active.heading")}</h3>
              <p className="mt-0.5 text-xs text-text-secondary">{t("active.note")}</p>
            </div>
            <span className="rounded-full border border-border-light bg-surface-secondary px-3 py-1 text-xs font-medium text-text-secondary">
              {t("active.count", { count: activeExceptions.length })}
            </span>
          </div>

          {activeExceptions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/40 px-4 py-5 text-sm text-text-muted">
              {t("empty")}
            </p>
          ) : (
            <div className="divide-y divide-border-light rounded-2xl border border-border-light bg-white px-4 dark:border-border-light dark:bg-surface-secondary">
              {activeExceptions.map((exc) => (
                <ExceptionRow
                  key={exc.id}
                  exception={exc}
                  onDelete={handleRestore}
                  isDeleting={deleteException.isPending}
                  timeZone={data.timezone}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteException.isError && <p className="mt-3 text-xs text-error-500">{t("deleteError")}</p>}
      {createException.isError && <p className="mt-3 text-xs text-error-500">{t("createError")}</p>}

      <CustomBlockModal isOpen={showCustomForm} onClose={() => setShowCustomForm(false)} />
    </div>
  );
}
