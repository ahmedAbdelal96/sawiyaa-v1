"use client";

import type { PlatformSetting } from "../../types/platform-settings.types";

type SelectEditorProps = {
  setting: PlatformSetting;
  value: string;
  onChange: (val: string) => void;
};

export function SelectEditor({ setting, value, onChange }: SelectEditorProps) {
  const options = setting.enumOptions || [];

  return (
    <select
      aria-label={setting.labelAr ?? setting.label}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className="text-text-primary w-full rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs font-medium outline-none focus:border-teal-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
