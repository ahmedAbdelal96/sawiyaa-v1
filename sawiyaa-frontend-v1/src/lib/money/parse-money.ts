import type { CurrencyCode, Money } from "./contracts";

export function parseMoney(input: { amount?: string | number | null; currencyCode?: string | null }): Money | null {
  const currencyCode = input.currencyCode?.trim().toUpperCase();
  const amount = input.amount === null || input.amount === undefined ? null : String(input.amount).trim();
  if ((currencyCode !== "EGP" && currencyCode !== "USD") || !amount || !Number.isFinite(Number(amount))) return null;
  return { amount, currencyCode: currencyCode as CurrencyCode };
}
