export type PatientMoneyFormatOptions = {
  fallbackText?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function formatPatientMoney(
  locale: string,
  amount: string | number,
  currencyCode?: string | null,
  options: PatientMoneyFormatOptions = {},
): string {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount;

  if (!Number.isFinite(numericAmount)) {
    return typeof amount === "string" ? amount : String(amount);
  }

  const normalizedCurrency = currencyCode?.trim().toUpperCase();
  if (!normalizedCurrency) {
    return (
      options.fallbackText ??
      (locale.startsWith("ar") ? "العملة غير متاحة" : "Currency unavailable")
    );
  }

  return new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG" : "en-US", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(numericAmount);
}


