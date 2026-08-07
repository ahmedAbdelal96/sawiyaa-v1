"use client";

import type { PlatformSetting } from "../../types/platform-settings.types";
import { cn } from "@/lib/utils";

type MultiSelectEditorProps = {
  setting: PlatformSetting;
  value: string[];
  onChange: (val: string[]) => void;
};

export function MultiSelectEditor({ setting, value, onChange }: MultiSelectEditorProps) {
  const options = setting.enumOptions || [];
  const selected = Array.isArray(value) ? value : [];

  const handleToggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-white/5 dark:bg-slate-950/50">
      {options.map((opt) => {
        const isChecked = selected.includes(opt);
        return (
          <label
            key={opt}
            className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleToggle(opt)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-white/10 dark:bg-slate-900"
            />
            <span>{opt}</span>
          </label>
        );
      })}
    </div>
  );
}
