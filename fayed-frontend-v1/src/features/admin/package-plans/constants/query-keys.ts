export const adminPackagePlansQueryKeys = {
  all: ["admin-package-plans"] as const,
  list: () => [...adminPackagePlansQueryKeys.all, "list"] as const,
  detail: (code: string) => [...adminPackagePlansQueryKeys.all, "detail", code] as const,
  settings: () => [...adminPackagePlansQueryKeys.all, "settings"] as const,
} as const;
