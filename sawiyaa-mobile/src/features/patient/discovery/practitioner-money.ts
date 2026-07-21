import { parseMoney, type Money, type Price } from "../../../lib/money";

export function mapPractitionerDurationMoney(input: { amount: number | string | null | undefined; currencyCode: string | null | undefined }): Money | null {
  return parseMoney(input.amount == null ? null : String(input.amount), input.currencyCode);
}

export function mapPractitionerDurationPrice(input: { amount: number | string | null | undefined; currencyCode: string | null | undefined }): Price {
  const money = mapPractitionerDurationMoney(input);
  return money && Number(money.amount) > 0 ? { status: "PAID", money } : { status: "UNAVAILABLE", money: null };
}
