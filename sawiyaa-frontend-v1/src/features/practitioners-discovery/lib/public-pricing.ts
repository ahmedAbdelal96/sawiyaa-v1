import { formatMoney, normalizeCurrencyCode } from "@/lib/finance-format";
import type { ActiveFeeFilterContext, PublicPractitioner } from "../types/practitioner";

export type PublicSessionPrice = {
  duration: 30 | 60;
  amount: number;
};

export function getPublicSessionPrices(
  practitioner: Pick<
    PublicPractitioner,
    "displaySessionPrice30" | "displaySessionPrice60"
  >,
): PublicSessionPrice[] {
  const prices: PublicSessionPrice[] = [];

  if (typeof practitioner.displaySessionPrice30 === "number") {
    prices.push({ duration: 30, amount: practitioner.displaySessionPrice30 });
  }

  if (typeof practitioner.displaySessionPrice60 === "number") {
    prices.push({ duration: 60, amount: practitioner.displaySessionPrice60 });
  }

  return prices;
}

export function formatPublicMoney(
  locale: string,
  amount: number,
  currencyCode?: string | null,
): string {
  return formatMoney(locale, amount, normalizeCurrencyCode(currencyCode) ?? "USD");
}

export function isPublicSessionPriceInActiveFeeRange(
  price: PublicSessionPrice,
  context: ActiveFeeFilterContext,
): boolean {
  const hasFeeFilter =
    typeof context.minSessionFee === "number" ||
    typeof context.maxSessionFee === "number";

  if (!hasFeeFilter) {
    return false;
  }

  if (context.duration && context.duration !== price.duration) {
    return false;
  }

  if (
    typeof context.minSessionFee === "number" &&
    price.amount < context.minSessionFee
  ) {
    return false;
  }

  if (
    typeof context.maxSessionFee === "number" &&
    price.amount > context.maxSessionFee
  ) {
    return false;
  }

  return true;
}
