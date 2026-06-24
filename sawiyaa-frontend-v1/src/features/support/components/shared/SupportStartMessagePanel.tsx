"use client";

import { Loader2, SendHorizonal } from "lucide-react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => Promise<void>;
  disabled?: boolean;
  isSubmitting?: boolean;
  helperNote?: string;
  compact?: boolean;
};

export default function SupportStartMessagePanel({
  value,
  onChange,
  onSubmit,
  disabled,
  isSubmitting,
  helperNote,
  compact = false,
}: Props) {
  const t = useTranslations("support");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    await onSubmit();
  };

  return (
    <section className={compact ? "app-panel rounded-[28px] p-4 sm:p-5" : "app-panel rounded-[32px] p-5 sm:p-7"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className={compact ? "text-base font-semibold text-text-primary dark:text-white/95" : "text-lg font-semibold text-text-primary dark:text-white/95"}>
            {t("create.heading")}
          </h2>
          <p className={compact ? "mt-1 text-xs text-text-secondary" : "mt-1 text-sm text-text-secondary"}>{t("create.note")}</p>
        </div>
      </div>

      <form className={compact ? "mt-3 space-y-2.5" : "mt-4 space-y-3"} onSubmit={handleSubmit}>
        <textarea
          rows={compact ? 2 : 3}
          maxLength={4000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("reply.placeholder")}
          className="w-full resize-none rounded-[20px] border border-border-light bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_22px_-18px_rgba(68,161,148,0.3)] focus:border-primary/35 dark:bg-white/5 dark:text-white"
        />

        {helperNote ? (
          <p className="text-xs leading-5 text-text-muted">{helperNote}</p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={disabled || isSubmitting || value.trim().length === 0}
            className={compact ? "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60" : "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("create.submitting")}
              </>
            ) : (
              <>
                <SendHorizonal className="h-4 w-4" />
                {t("create.submit")}
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
