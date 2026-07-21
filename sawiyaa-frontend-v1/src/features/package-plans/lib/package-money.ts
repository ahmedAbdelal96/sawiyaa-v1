import { parseMoney, type Money, type Price } from "@/lib/money";

function paidMoney(amount: string | number | null | undefined, currencyCode: string | null | undefined): Money | null {
  const money = parseMoney({ amount, currencyCode });
  return money && Number(money.amount) > 0 ? money : null;
}

export function mapPackagePublicPrice(input: { priceStatus?: string | null; priceAmount?: string | number | null; currencyCode?: string | null }): Price {
  const money = input.priceStatus === "PAID" ? paidMoney(input.priceAmount, input.currencyCode) : null;
  return money ? { status: "PAID", money } : { status: "UNAVAILABLE", money: null };
}

export function mapPackageQuoteMoney(input: { amount?: string | number | null; selectedCurrencyCode?: string | null }): Money | null {
  return paidMoney(input.amount, input.selectedCurrencyCode);
}

export function mapPackagePurchaseSnapshotMoney(input: { amount?: string | number | null; selectedCurrencyCode?: string | null }): Money | null {
  return paidMoney(input.amount, input.selectedCurrencyCode);
}

export function mapPackagePaymentSnapshotMoney(input: { amount?: string | number | null; currency?: string | null }): Money | null {
  return paidMoney(input.amount, input.currency);
}
