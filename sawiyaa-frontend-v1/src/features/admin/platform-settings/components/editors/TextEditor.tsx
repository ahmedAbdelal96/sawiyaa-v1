"use client";

import type { PlatformSetting } from "../../types/platform-settings.types";

type TextEditorProps = {
  setting: PlatformSetting;
  value: string;
  onChange: (val: string) => void;
};

export function TextEditor({ setting, value, onChange }: TextEditorProps) {
  const control = setting.uiMetadata?.control;

  if (control === "textarea") {
    return (
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="text-text-primary w-full rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 font-mono text-xs outline-none focus:border-teal-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
      />
    );
  }

  return (
    <input
      type={control === "secret" ? "password" : "text"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="text-text-primary w-full rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 font-mono text-xs outline-none focus:border-teal-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
    />
  );
}
