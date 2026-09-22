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

  const normalizedCurrency = currencyCode?.trim().toUpperCase() || "EGP";
  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(numericAmount);

  if (locale.startsWith("ar")) {
    if (normalizedCurrency === "EGP") return `${formattedNumber} ج.م.`;
    if (normalizedCurrency === "USD") return `${formattedNumber} $`;
    if (normalizedCurrency === "SAR") return `${formattedNumber} ر.س.`;
    if (normalizedCurrency === "AED") return `${formattedNumber} د.إ.`;
    return `${formattedNumber} ${normalizedCurrency}`;
  }

  if (normalizedCurrency === "USD") return `$${formattedNumber}`;
  if (normalizedCurrency === "EGP") return `${formattedNumber} EGP`;
  return `${formattedNumber} ${normalizedCurrency}`;
}



