export type FinanceMoneyFormatOptions = {
  fallbackText?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export type CurrencyGroupedAmount = {
  currencyCode: string;
  amount: number;
};

export function normalizeCurrencyCode(currencyCode?: string | null): string | null {
  const value = currencyCode?.trim().toUpperCase();
  return value ? value : null;
}

export function formatMoney(
  locale: string,
  amount: string | number,
  currencyCode?: string | null,
  options: FinanceMoneyFormatOptions = {},
) {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(numeric)) {
    return typeof amount === "string" ? amount : String(amount);
  }

  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  if (!normalizedCurrency) {
    return options.fallbackText ?? (locale.startsWith("ar") ? "العملة غير متاحة" : "Currency unavailable");
  }

  return new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG" : "en-US", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(numeric);
}

export function formatCurrencyLabel(currencyCode?: string | null, fallbackText = "Currency unavailable") {
  return normalizeCurrencyCode(currencyCode) ?? fallbackText;
}

export function groupAmountsByCurrency<T>(
  items: readonly T[],
  getCurrencyCode: (item: T) => string | null | undefined,
  getAmount: (item: T) => string | number,
) {
  const totals = new Map<string, number>();

  for (const item of items) {
    const currencyCode = normalizeCurrencyCode(getCurrencyCode(item));
    if (!currencyCode) continue;

    const numeric = Number(getAmount(item));
    if (!Number.isFinite(numeric)) continue;

    totals.set(currencyCode, (totals.get(currencyCode) ?? 0) + numeric);
  }

  return Array.from(totals.entries())
    .map(([currencyCode, amount]) => ({ currencyCode, amount }))
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}
