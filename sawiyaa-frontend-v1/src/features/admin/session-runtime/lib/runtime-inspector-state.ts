export const RUNTIME_INSPECTOR_TABS = [
  "overview",
  "attendance",
  "package",
  "decisions",
  "support",
  "diagnostics",
] as const;

export type RuntimeInspectorTab = (typeof RUNTIME_INSPECTOR_TABS)[number];

export function normalizeRuntimeInspectorTab(
  value: string | null | undefined,
): RuntimeInspectorTab {
  return RUNTIME_INSPECTOR_TABS.includes(value as RuntimeInspectorTab)
    ? (value as RuntimeInspectorTab)
    : "overview";
}

export function canWriteRuntimeInspector(
  permissions: string[] | undefined,
  isLoading: boolean,
): boolean {
  return (
    !isLoading &&
    Boolean(permissions?.includes("SESSIONS_MANUAL_DECISIONS_WRITE"))
  );
}
