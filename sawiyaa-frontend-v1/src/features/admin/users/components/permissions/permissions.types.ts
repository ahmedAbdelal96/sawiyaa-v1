import type { AdminPermissionCatalogItem, AdminPermissionRisk } from "../../constants/admin-permission-catalog";
import type { AdminUserPermissionOverride } from "../../types/admin-users.types";

export type OverrideEffect = "INHERITED" | "ALLOW" | "DENY";

export type PermissionDraftState = Record<string, OverrideEffect>;

export type DensityMode = "compact" | "comfortable";

export type StateFilterValue =
  | "all"
  | "overriddenOnly"
  | "inheritedOnly"
  | "explicitAllow"
  | "explicitDeny"
  | "effectiveAllow"
  | "effectiveDeny";

export type RiskFilterValue = "all" | AdminPermissionRisk;

export type PermissionRowData = {
  key: string;
  module: string;
  defaultChecked: boolean; // inherited from role
  initialOverrideEffect: OverrideEffect; // starting override effect in backend
  currentDraftEffect: OverrideEffect; // current effect in draft
  effectiveAllowed: boolean; // final resulting boolean state
  catalogItem?: AdminPermissionCatalogItem;
  override?: AdminUserPermissionOverride;
  isModified: boolean; // whether draft differs from initial override
};

export type ModuleGroupData = {
  module: string;
  title: string;
  description: string;
  rows: PermissionRowData[];
  totalCount: number;
  roleAllowedCount: number;
  effectiveAllowedCount: number;
  effectiveDeniedCount: number;
  explicitAllowCount: number;
  explicitDenyCount: number;
  modifiedCount: number;
};
