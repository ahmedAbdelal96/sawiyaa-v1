"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { useTranslations } from "next-intl";

type ListEditorProps = {
  setting: PlatformSetting;
  value: (string | number)[];
  onChange: (val: (string | number)[]) => void;
};

export function ListEditor({ setting, value, onChange }: ListEditorProps) {
  const t = useTranslations("admin-platform-settings");
  const control = setting.uiMetadata?.control;
  const isIntegerList = control === "integer-list";
  const [inputText, setInputText] = useState("");
  const list = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    let newValue: string | number = trimmed;
    if (isIntegerList) {
      const parsed = parseInt(trimmed, 10);
      if (isNaN(parsed)) return;
      newValue = parsed;
    }

    if (list.includes(newValue)) {
      // Prevent duplicates if uniqueItems is set
      if (setting.uiMetadata?.uniqueItems) {
        setInputText("");
        return;
      }
    }

    onChange([...list, newValue]);
    setInputText("");
  };

  const handleRemove = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type={isIntegerList ? "number" : "text"}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={t("editor.arrayAddPlaceholder")}
          className="text-text-primary flex-1 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs outline-none focus:border-teal-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-xl bg-teal-600 p-2.5 font-bold text-white transition hover:bg-teal-700"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex min-h-[40px] flex-wrap gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50 p-2 dark:border-white/5 dark:bg-slate-950/40">
        {list.length === 0 ? (
          <span className="text-text-muted text-[11px] italic">
            [No items]
          </span>
        ) : (
          list.map((item, idx) => (
            <span
              key={idx}
              className="text-text-primary inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-bold shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-white"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-text-muted transition hover:text-rose-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
