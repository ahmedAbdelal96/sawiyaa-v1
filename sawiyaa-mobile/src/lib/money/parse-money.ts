import type { AcademyPrice, CurrencyCode, Money, Price, PriceStatus } from "./contracts";

const DECIMAL_AMOUNT = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function parseCurrencyCode(value: unknown): CurrencyCode | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized === "EGP" || normalized === "USD" ? normalized : null;
}

export function parseMoney(amount: unknown, currencyCode: unknown): Money | null {
  const normalizedAmount = typeof amount === "string" ? amount.trim() : "";
  const currency = parseCurrencyCode(currencyCode);
  if (!DECIMAL_AMOUNT.test(normalizedAmount) || !currency) return null;

  return { amount: normalizedAmount, currencyCode: currency };
}

export function parsePrice(input: {
  priceStatus?: unknown;
  pricingStatus?: unknown;
  priceAmount?: unknown;
  currencyCode?: unknown;
}): Price {
  const status = normalizeStatus(input.priceStatus ?? input.pricingStatus);
  const money = parseMoney(input.priceAmount, input.currencyCode);
  if (status === "FREE") return { status: "FREE", money: null };
  if (status === "PAID" && money && Number(money.amount) > 0) return { status: "PAID", money };
  return { status: "UNAVAILABLE", money: null };
}

export function parseAcademyPrice(input: {
  priceStatus?: unknown;
  pricingStatus?: unknown;
  priceAmount?: unknown;
  currencyCode?: unknown;
}): AcademyPrice {
  const price = parsePrice(input);
  return price.status === "PAID"
    ? { status: "PAID", money: price.money }
    : { status: "UNAVAILABLE", money: null };
}

function normalizeStatus(value: unknown): PriceStatus | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized === "PAID" || normalized === "FREE" || normalized === "UNAVAILABLE"
    ? normalized
    : null;
}
