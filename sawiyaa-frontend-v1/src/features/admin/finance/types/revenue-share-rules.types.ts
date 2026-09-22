export type RevenueShareRulesItem = {
  configurationState: "READY" | "REQUIRES_UNIFICATION";
  platformCommissionPercent: string | null;
  practitionerSharePercent: string | null;
  effectiveAt: string | null;
  updatedAt: string | null;
  expectedUpdatedAt: string | null;
};

export type RevenueShareRulesResponseData = {
  item: RevenueShareRulesItem;
};

export type UpdateRevenueShareRulesRequest = {
  platformCommissionPercent: string;
  reason: string;
  expectedUpdatedAt?: string | null;
};
