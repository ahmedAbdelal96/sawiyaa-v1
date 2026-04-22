"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useCreateModerationReport } from "../hooks/use-moderation";
import type { ModerationReportReason, ModerationReportTargetType } from "../types/moderation.types";

type Props = {
  targetType: ModerationReportTargetType;
  targetId: string;
  onClose: () => void;
};

const REASONS: ModerationReportReason[] = [
  "HARASSMENT",
  "ABUSE",
  "INAPPROPRIATE_CONTENT",
  "SPAM",
  "SCAM",
  "PRIVACY_BREACH",
  "OTHER",
];

export default function InlineReportComposer({ targetType, targetId, onClose }: Props) {
  const t = useTranslations("moderation");
  const { handleApiError, showSuccess } = useErrorHandler();
  const createMutation = useCreateModerationReport();

  const [reason, setReason] = useState<ModerationReportReason>("HARASSMENT");
  const [note, setNote] = useState("");

  const canSubmit = useMemo(() => {
    if (createMutation.isPending) return false;
    return Boolean(reason) && Boolean(targetType) && Boolean(targetId);
  }, [createMutation.isPending, reason, targetId, targetType]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      await createMutation.mutateAsync({
        targetType,
        targetId,
        reason,
        note: note.trim() || undefined,
      });
      showSuccess(t("toast.sent"));
      onClose();
    } catch (err) {
      handleApiError(err, t("toast.error"));
    }
  };

  return (
    <div className="rounded-xl border border-border-light/80 bg-white/90 p-3 shadow-[0_14px_28px_-22px_rgba(34,52,56,0.14)] backdrop-blur dark:border-white/10 dark:bg-surface-secondary/80">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary dark:text-white/90">
            {t("title")}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary dark:text-white/70">
            {t("hint")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border-light bg-white px-2 text-xs font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/75"
        >
          {t("actions.cancel")}
        </button>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text-secondary dark:text-white/70">
            {t("fields.reason")}
          </span>
          <div className="relative">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ModerationReportReason)}
              className="app-control w-full rounded-lg border-border-strong bg-white px-2 py-2 text-xs dark:border-white/15 dark:bg-white/8"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}` as never)}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text-secondary dark:text-white/70">
            {t("fields.note")}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("placeholders.note")}
            maxLength={1000}
            rows={2}
            className="app-control w-full resize-none rounded-lg border-border-strong bg-white px-2 py-2 text-xs dark:border-white/15 dark:bg-white/8"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-active text-xs font-semibold text-white shadow-[0_12px_22px_-14px_rgba(68,161,148,0.72)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {t("actions.submit")}
        </button>
      </form>
    </div>
  );
}
