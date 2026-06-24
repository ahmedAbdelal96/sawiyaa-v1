export type AdminRefundPolicyType = "SESSION" | "PACKAGE";

export type AdminRefundPolicyClause = {
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

export type AdminRefundPolicy = {
  id: string;
  policyType: AdminRefundPolicyType;
  key: string;
  titleAr: string | null;
  titleEn: string | null;
  isActive: boolean;
  clauses: AdminRefundPolicyClause[];
  clauseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminRefundPoliciesResponseData = {
  items: AdminRefundPolicy[];
};

export type AdminRefundPolicyResponseData = {
  item: AdminRefundPolicy;
};

export type UpdateAdminRefundPolicyInput = {
  titleAr?: string | null;
  titleEn?: string | null;
  isActive?: boolean;
};

export type CreateAdminRefundPolicyClauseInput = {
  titleAr?: string | null;
  titleEn?: string | null;
  bodyAr: string;
  bodyEn: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type ReorderAdminRefundPolicyClausesInput = {
  items: Array<{
    id: string;
    sortOrder: number;
  }>;
};
