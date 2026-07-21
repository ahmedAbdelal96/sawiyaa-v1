import { formatLocalizedMoney } from "@/lib/finance-format";
import type { ActiveFeeFilterContext, PublicPractitioner } from "../types/practitioner";

export type PublicSessionPrice = {
  duration: 30 | 60;
  amount: number;
};

export function getPublicSessionPrices(
  practitioner: Pick<
    PublicPractitioner,
    "sessionPrice30" | "sessionPrice60"
  >,
): PublicSessionPrice[] {
  const prices: PublicSessionPrice[] = [];

  if (typeof practitioner.sessionPrice30 === "number") {
    prices.push({ duration: 30, amount: practitioner.sessionPrice30 });
  }

  if (typeof practitioner.sessionPrice60 === "number") {
    prices.push({ duration: 60, amount: practitioner.sessionPrice60 });
  }

  return prices;
}

export function formatPublicMoney(
  locale: string,
  amount: number,
  currencyCode?: string | null,
): string {
  return formatLocalizedMoney({ amount, currencyCode, locale }) ??
    (locale.startsWith("ar") ? "تعذر عرض السعر حالياً" : "Price unavailable");
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
