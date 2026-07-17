import type { ListAdminPractitionerRecoveriesParams } from "../types/admin-practitioner-recoveries.types";

export const adminPractitionerRecoveriesQueryKeys = {
  all: ["admin-practitioner-recoveries"] as const,
  list: (params?: ListAdminPractitionerRecoveriesParams) =>
    [...adminPractitionerRecoveriesQueryKeys.all, "list", params ?? {}] as const,
  detail: (id: string) => [...adminPractitionerRecoveriesQueryKeys.all, "detail", id] as const,
};
