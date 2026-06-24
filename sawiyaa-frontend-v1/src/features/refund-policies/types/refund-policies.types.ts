export type RefundPolicyType = "SESSION" | "PACKAGE";

export type RefundPolicyClause = {
  id: string;
  titleAr: string | null;
  titleEn: string | null;
  bodyAr: string;
  bodyEn: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RefundPolicy = {
  id: string;
  policyType: RefundPolicyType;
  key: string;
  titleAr: string | null;
  titleEn: string | null;
  isActive: boolean;
  clauses: RefundPolicyClause[];
  clauseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RefundPolicyResponseData = {
  item: RefundPolicy;
};

export type RefundPoliciesResponseData = {
  items: RefundPolicy[];
};
