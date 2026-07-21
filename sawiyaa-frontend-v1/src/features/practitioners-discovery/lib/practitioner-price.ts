import { parseMoney, type Money, type Price } from "@/lib/money";

export function mapPractitionerDurationMoney(input: { amount: number | null | undefined; currencyCode: string | null | undefined }): Money | null {
  return parseMoney({ amount: input.amount, currencyCode: input.currencyCode });
}

export function mapPractitionerPublicPrice(input: { amount: number | null | undefined; currencyCode: string | null | undefined }): Price {
  const money = mapPractitionerDurationMoney(input);
  return money ? { status: "PAID", money } : { status: "UNAVAILABLE", money: null, reasonCode: "SELECTED_PRICE_MISSING" };
}
