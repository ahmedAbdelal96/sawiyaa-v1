import type { ListModerationReportsParams } from "../types/admin-moderation-reports.types";

export const adminModerationReportsQueryKeys = {
  all: ["admin-moderation-reports"] as const,
  list: (params?: ListModerationReportsParams) =>
    [...adminModerationReportsQueryKeys.all, "list", params ?? {}] as const,
  detail: (id: string) =>
    [...adminModerationReportsQueryKeys.all, "detail", id] as const,
};
