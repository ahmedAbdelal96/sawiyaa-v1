export type AdminPackagePlanCode = "SESSIONS_4" | "SESSIONS_6" | "SESSIONS_8";

export type AdminPackagePlanItem = {
  id: string;
  code: AdminPackagePlanCode;
  title: string;
  description: string | null;
  sessionCount: number;
  discountPercent: string;
  isActive: boolean;
  sortOrder: number;
  archivedAt: string | null;
  metadataJson: unknown;
  createdAt: string;
  updatedAt: string;
  counts: {
    purchaseCount: number;
  };
};

export type AdminPackagePlanListResponseData = {
  items: AdminPackagePlanItem[];
};

export type AdminPackagePlanDetailResponseData = {
  item: AdminPackagePlanItem;
};

export type UpdateAdminPackagePlanInput = {
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type AdminPackagePlanSettingsItem = {
  packagesEnabled: boolean;
  packagesPurchaseEnabled: boolean;
};

export type AdminPackagePlanSettingsResponseData = {
  item: AdminPackagePlanSettingsItem;
};

export type UpdateAdminPackagePlanSettingsInput = {
  packagesEnabled: boolean;
  packagesPurchaseEnabled: boolean;
};
