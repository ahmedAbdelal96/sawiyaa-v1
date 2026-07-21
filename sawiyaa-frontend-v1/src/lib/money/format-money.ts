import type { Money, MoneyFormatLabels } from "./contracts";

export function formatLocalizedMoney(input: { money: Money; locale: string; labels: MoneyFormatLabels }): string {
  const amount = Number(input.money.amount);
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
  if (input.locale.startsWith("ar")) return `${formatted} ${input.labels[input.money.currencyCode]}`;
  return input.money.currencyCode === "USD" ? `$${formatted} USD` : `EGP ${formatted}`;
}
