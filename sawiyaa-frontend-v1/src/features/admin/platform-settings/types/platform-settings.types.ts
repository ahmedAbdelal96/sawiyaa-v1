export type PlatformSetting = {
  key: string;
  label: string;
  description: string;
  category: string;
  domain: string;
  valueType:
    "STRING" | "NUMBER" | "INTEGER" | "BOOLEAN" | "STRING_ARRAY" | "JSON";
  value: unknown;
  defaultValue: unknown;
  source: "OVERRIDE" | "CATALOG_DEFAULT";
  editable: boolean;
  readOnlyReason?: "DEDICATED_PAYMENT_CONTROL" | "READ_ONLY_DEFINITION";
  permission: string;
  minimum?: number;
  maximum?: number;
  enumOptions: string[] | null;
  jsonSchemaId: string | null;
  valueId: string | null;
  expectedUpdatedAt: string | null;
  changedAt: string;
  effect: "DEDICATED_CONTROL" | "IMMEDIATE";
};

export type PlatformSettingsResponse = {
  categories: string[];
  settings: PlatformSetting[];
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
