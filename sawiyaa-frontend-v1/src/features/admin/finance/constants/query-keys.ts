export const adminFinanceQueryKeys = {
  all: ["admin-finance"] as const,
  hubSummary: () => [...adminFinanceQueryKeys.all, "hub-summary"] as const,
};
