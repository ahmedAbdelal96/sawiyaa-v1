"use client";

import type { PlatformSetting } from "../../types/platform-settings.types";
import { ToggleEditor } from "./ToggleEditor";
import { NumberEditor } from "./NumberEditor";
import { SelectEditor } from "./SelectEditor";
import { MultiSelectEditor } from "./MultiSelectEditor";
import { ListEditor } from "./ListEditor";
import { TextEditor } from "./TextEditor";
import { StructuredEditor } from "./StructuredEditor";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type EditorControlProps = {
  setting: PlatformSetting;
  value: unknown;
  onChange: (val: unknown) => void;
  onValidationChange?: (isValid: boolean) => void;
};

export function EditorControl({
  setting,
  value,
  onChange,
  onValidationChange,
}: EditorControlProps) {
  const t = useTranslations("admin-platform-settings");
  const control = setting.uiMetadata?.control;

  // Enforce read-only if control is missing or setting status is LEGACY
  if (setting.status === "LEGACY" || !control) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-white/5 dark:bg-slate-950/50">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>
            {setting.status === "LEGACY"
              ? "Legacy settings are read-only and cannot be updated."
              : "This setting is configured as read-only (missing UI metadata)."}
          </span>
        </div>
        <pre className="rounded bg-slate-100 p-2 font-mono text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-300 overflow-x-auto">
          {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "")}
        </pre>
      </div>
    );
  }

  switch (control) {
    case "toggle":
      return <ToggleEditor value={Boolean(value)} onChange={onChange} />;

    case "integer":
    case "decimal":
    case "percentage":
    case "duration":
      return (
        <NumberEditor
          setting={setting}
          value={Number(value ?? 0)}
          onChange={onChange}
        />
      );

    case "select":
      return (
        <SelectEditor
          setting={setting}
          value={String(value ?? "")}
          onChange={onChange}
        />
      );

    case "multi-select":
      return (
        <MultiSelectEditor
          setting={setting}
          value={(value as string[]) || []}
          onChange={onChange}
        />
      );

    case "integer-list":
    case "string-list":
      return (
        <ListEditor
          setting={setting}
          value={(value as (string | number)[]) || []}
          onChange={onChange}
        />
      );

    case "text":
    case "textarea":
    case "secret":
      return (
        <TextEditor
          setting={setting}
          value={String(value ?? "")}
          onChange={onChange}
        />
      );

    case "structured":
      return (
        <StructuredEditor
          setting={setting}
          value={value}
          onChange={onChange}
          onError={(hasError) => {
            if (onValidationChange) {
              onValidationChange(!hasError);
            }
          }}
        />
      );

    default:
      return (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-white/5 dark:bg-slate-950/50">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Unsupported editor control: {control}</span>
          </div>
          <pre className="rounded bg-slate-100 p-2 font-mono text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {String(value ?? "")}
          </pre>
        </div>
      );
  }
}
