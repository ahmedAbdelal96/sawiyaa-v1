export type RevenueShareRuleItem = {
  ruleId: string;
  slug: string;
  platformRatePercent: string;
  practitionerRatePercent: string;
  updatedAt: string;
};

export type RevenueShareRulesItem = {
  local: RevenueShareRuleItem;
  crossBorder: RevenueShareRuleItem;
};

export type RevenueShareRulesResponseData = {
  item: RevenueShareRulesItem;
};

export type UpdateRevenueShareRulesRequest = {
  localPlatformRatePercent: string;
  localPractitionerRatePercent: string;
  crossBorderPlatformRatePercent: string;
  crossBorderPractitionerRatePercent: string;
};
