export const financialOperationsQueryKeys = {
  all: ["financial-operations"] as const,
  practitionerWallet: () =>
    [...financialOperationsQueryKeys.all, "practitioner-wallet"] as const,
  practitionerLedger: (params?: Record<string, unknown>) =>
    [...financialOperationsQueryKeys.all, "practitioner-ledger", params ?? {}] as const,
  practitionerSettlements: (params?: Record<string, unknown>) =>
    [
      ...financialOperationsQueryKeys.all,
      "practitioner-settlements",
      params ?? {},
    ] as const,
};
