"use client";

import type { PlatformSetting } from "../../types/platform-settings.types";

type NumberEditorProps = {
  setting: PlatformSetting;
  value: number;
  onChange: (val: number) => void;
};

export function NumberEditor({ setting, value, onChange }: NumberEditorProps) {
  const control = setting.uiMetadata?.control;
  const isInteger = control === "integer" || control === "duration";
  const step = isInteger ? 1 : "any";

  // Translate unit or show raw if not translated
  const unit = setting.uiMetadata?.control === "percentage" ? "%" : (setting.minimum !== undefined || setting.maximum !== undefined ? "" : "");

  return (
    <div className="space-y-1.5">
      <div className="relative flex items-center">
        <input
          type="number"
          min={setting.minimum}
          max={setting.maximum}
          step={step}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const rawVal = e.target.value;
            if (rawVal === "") return;
            const num = Number(rawVal);
            onChange(isInteger ? Math.round(num) : num);
          }}
          className="text-text-primary w-full rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 font-mono text-xs outline-none focus:border-teal-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white pr-10"
        />
        {setting.minimum !== undefined && setting.maximum !== undefined && (
          <span className="absolute right-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            {setting.minimum}..{setting.maximum}
          </span>
        )}
      </div>
      {(setting.minimum !== undefined || setting.maximum !== undefined) && (
        <p className="text-text-muted text-[10px]">
          Allowed range: {setting.minimum ?? "Min"} - {setting.maximum ?? "Max"}
        </p>
      )}
    </div>
  );
}
