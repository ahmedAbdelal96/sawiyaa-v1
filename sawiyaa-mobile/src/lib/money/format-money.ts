import type { CurrencyCode, Money } from "./contracts";

function formatAmount(amount: string): string {
  const [whole, fraction] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction && Number(fraction) !== 0 ? `${grouped}.${fraction.padEnd(2, "0")}` : grouped;
}

export function formatMoney(money: Money, locale: string): string {
  const amount = formatAmount(money.amount);
  const isArabic = locale.toLowerCase().startsWith("ar");
  if (isArabic) {
    return money.currencyCode === "EGP" ? `${amount} جنيه مصري` : `${amount} دولار أمريكي`;
  }
  return money.currencyCode === "EGP" ? `EGP ${amount}` : `$${amount} USD`;
}

export function currencyName(currencyCode: CurrencyCode, locale: string): string {
  if (locale.toLowerCase().startsWith("ar")) {
    return currencyCode === "EGP" ? "جنيه مصري" : "دولار أمريكي";
  }
  return currencyCode;
}
