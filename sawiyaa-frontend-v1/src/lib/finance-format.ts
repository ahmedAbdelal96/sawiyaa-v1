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

export type LocalizedMoneyInput = {
  amount: string | number;
  currencyCode?: string | null;
  locale: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/**
 * Formats an amount/currency pair already selected by the backend. It never
 * chooses a currency or falls back when the API contract is incomplete.
 */
export function formatLocalizedMoney(input: LocalizedMoneyInput): string | null {
  const numeric = typeof input.amount === "string" ? Number(input.amount) : input.amount;
  const currencyCode = normalizeCurrencyCode(input.currencyCode);

  if (!Number.isFinite(numeric) || (currencyCode !== "EGP" && currencyCode !== "USD")) {
    return null;
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: input.minimumFractionDigits ?? 0,
    maximumFractionDigits: input.maximumFractionDigits ?? 2,
  }).format(numeric);
  const isArabic = input.locale.toLowerCase().startsWith("ar");

  if (isArabic) {
    return currencyCode === "USD"
      ? `${formattedAmount} دولار أمريكي`
      : `${formattedAmount} جنيه مصري`;
  }

  return currencyCode === "USD"
    ? `$${formattedAmount} USD`
    : `EGP ${formattedAmount}`;
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

  const localized = formatLocalizedMoney({
    amount,
    currencyCode,
    locale,
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  });
  if (!localized) {
    return options.fallbackText ?? (locale.startsWith("ar") ? "العملة غير متاحة" : "Currency unavailable");
  }
  return localized;
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

