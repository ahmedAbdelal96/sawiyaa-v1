"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ToggleEditorProps = {
  value: boolean;
  onChange: (val: boolean) => void;
};

export function ToggleEditor({ value, onChange }: ToggleEditorProps) {
  const t = useTranslations("admin-platform-settings");
  const isChecked = Boolean(value);

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-white/5 dark:bg-slate-950/50">
      <button
        type="button"
        onClick={() => onChange(!isChecked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
          isChecked ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out rtl:translate-x-0",
            isChecked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0",
          )}
        />
      </button>
      <span className="text-text-primary text-xs font-bold dark:text-white">
        {isChecked ? t("editor.booleanEnabled") : t("editor.booleanDisabled")}
      </span>
    </div>
  );
}
