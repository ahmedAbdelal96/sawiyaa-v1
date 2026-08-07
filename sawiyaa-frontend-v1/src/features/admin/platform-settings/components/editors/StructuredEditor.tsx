"use client";

import { useState, useEffect } from "react";
import type { PlatformSetting } from "../../types/platform-settings.types";
import { AlertCircle } from "lucide-react";

type StructuredEditorProps = {
  setting: PlatformSetting;
  value: unknown;
  onChange: (val: unknown) => void;
  onError: (hasError: boolean) => void;
};

export function StructuredEditor({ setting, value, onChange, onError }: StructuredEditorProps) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(text);
      setError(null);
      onError(false);
      onChange(parsed);
    } catch (e: any) {
      setError(e.message || "Invalid JSON syntax");
      onError(true);
    }
  }, [text]);

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="text-text-primary w-full rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 font-mono text-xs outline-none focus:border-teal-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
        placeholder={'{\n  "key": "value"\n}'}
      />
      {error && (
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
      {setting.jsonSchemaId && (
        <p className="text-text-muted text-[10px]">
          Validated against schema: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{setting.jsonSchemaId}</code>
        </p>
      )}
    </div>
  );
}
