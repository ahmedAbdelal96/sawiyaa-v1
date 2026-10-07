export type PlatformSetting = {
  key: string;
  label: string;
  labelAr?: string;
  description: string;
  descriptionAr?: string;
  category: string;
  domain: string;
  valueType:
    "STRING" | "NUMBER" | "INTEGER" | "BOOLEAN" | "STRING_ARRAY" | "JSON";
  value: unknown;
  defaultValue: unknown;
  source: "OVERRIDE" | "CATALOG_DEFAULT";
  effectiveSource?:
    | "DATABASE_OVERRIDE"
    | "CATALOG_DEFAULT"
    | "ENVIRONMENT"
    | "SYSTEM_MANAGED"
    | "DEDICATED_CONTROL"
    | "MISSING"
    | "LEGACY";
  ownership?:
    | "BUSINESS"
    | "OPERATIONAL"
    | "FINANCIAL"
    | "SECURITY"
    | "ENVIRONMENT"
    | "SYSTEM"
    | "LEGACY";
  primaryDomain?:
    | "sessions"
    | "notifications"
    | "messaging"
    | "practitioners"
    | "patientsAccounts"
    | "contentAcademy"
    | "general"
    | "paymentsFinance"
    | "advanced";
  section?: string;
  dedicatedRoute?: string | null;
  editable: boolean;
  readOnlyReason?:
    | "DEDICATED_PAYMENT_CONTROL"
    | "READ_ONLY_DEFINITION"
    | "LEGACY_DEPRECATED"
    | "ENVIRONMENT_MANAGED"
    | "SYSTEM_MANAGED";
  permission: string;
  minimum?: number;
  maximum?: number;
  enumOptions: string[] | null;
  jsonSchemaId: string | null;
  valueId: string | null;
  expectedUpdatedAt: string | null;
  changedAt: string;
  effect: "DEDICATED_CONTROL" | "IMMEDIATE" | "NEW_SESSIONS_ONLY";
  status:
    | "ACTIVE"
    | "PARTIALLY_ACTIVE"
    | "SEEDED_BUT_UNUSED"
    | "DUPLICATED_WITH_ENV"
    | "MISNAMED"
    | "WRITE_ONLY"
    | "LEGACY";
  deprecatedReplacementKey: string | null;
  deprecationReason: string | null;
  uiMetadata: {
    control:
      | "toggle"
      | "integer"
      | "decimal"
      | "percentage"
      | "duration"
      | "select"
      | "multi-select"
      | "integer-list"
      | "string-list"
      | "time"
      | "time-range"
      | "text"
      | "textarea"
      | "secret"
      | "structured";
    sortable?: boolean;
    uniqueItems?: boolean;
    allowZero?: boolean;
    itemLabelKey?: string;
    helpTextKey?: string;
    impactTextKey?: string;
    warningTextKey?: string;
    advancedOnly?: boolean;
  } | null;
  capabilities?: {
    canView: boolean;
    canEdit: boolean;
    canReset: boolean;
    canViewHistory: boolean;
    requiresConfirmation: boolean;
    requiresReason: boolean;
    requiresStepUp: boolean;
    managedByDedicatedControl: boolean;
    advancedOnly: boolean;
  };
};

export type PlatformSettingDomain =
  | "sessions"
  | "notifications"
  | "messaging"
  | "practitioners"
  | "patientsAccounts"
  | "contentAcademy"
  | "general"
  | "paymentsFinance"
  | "advanced";

export type PlatformSettingDomainSummary = {
  primaryDomain: PlatformSettingDomain;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  count: number;
  ordinaryCount: number;
  customizedCount: number;
  attentionCount: number;
  permissionState: "EDITABLE" | "VIEW_ONLY" | "MANAGED_ELSEWHERE";
  lastChange: string | null;
  dedicatedRoute: string | null;
  status: "READY" | "NEEDS_ATTENTION" | "MANAGED_ELSEWHERE" | "ADVANCED";
};

export type PlatformSettingsResponse = {
  categories: string[];
  settings: PlatformSetting[];
  legacySettings: PlatformSetting[];
  advancedSettings: PlatformSetting[];
  domains: PlatformSettingDomainSummary[];
};

export type PlatformSettingsChange = {
  key: string;
  value?: unknown;
  reset?: boolean;
  expectedUpdatedAt?: string | null;
};

export type PlatformSettingsChangeSetInput = {
  domain?: PlatformSettingDomain;
  changes: PlatformSettingsChange[];
  reason: string;
};

export type PlatformSettingsChangeSetResponse = {
  domain: PlatformSettingDomain | null;
  results: Array<{
    key: string;
    kind: "update" | "reset";
    changed: boolean;
    value: unknown;
    valueId: string | null;
    previousValueId: string | null;
    updatedAt: string | null;
    changeLogId: string | null;
  }>;
  settings: PlatformSetting[];
  changedCount: number;
};

export type PlatformSettingHistory = {
  key: string;
  items: Array<{
    id: string;
    changeAction: string;
    oldValueSnapshot: unknown;
    newValueSnapshot: unknown;
    reason: string | null;
    changedAt: string;
    configValueId: string | null;
    changedByUser: {
      id: string;
      displayName: string | null;
      emails: Array<{ email: string }>;
    } | null;
  }>;
  meta: { page: number; limit: number; total: number; totalPages: number };
};
