export type RefundPolicyType = "SESSION" | "PACKAGE";

export interface RefundPolicyClause {
  id: string;
  titleAr: string | null;
  titleEn: string | null;
  bodyAr: string;
  bodyEn: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefundPolicy {
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
}

export interface RefundPolicyResponseData {
  item: RefundPolicy;
}

export interface RefundPoliciesResponseData {
  items: RefundPolicy[];
}
