export type PlatformSetting = {
  key: string;
  label: string;
  labelAr?: string;
  description: string;
  descriptionAr?: string;
  category: string;
  domain: string;
  valueType:
    | "STRING"
    | "NUMBER"
    | "INTEGER"
    | "BOOLEAN"
    | "STRING_ARRAY"
    | "JSON";
  value: unknown;
  defaultValue: unknown;
  source: "OVERRIDE" | "CATALOG_DEFAULT";
  editable: boolean;
  readOnlyReason?:
    | "DEDICATED_PAYMENT_CONTROL"
    | "READ_ONLY_DEFINITION"
    | "LEGACY_DEPRECATED";
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
};

export type PlatformSettingsResponse = {
  categories: string[];
  settings: PlatformSetting[];
  legacySettings: PlatformSetting[];
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
