export type CurrencyCode = "EGP" | "USD";

export type Money = { amount: string; currencyCode: CurrencyCode };

export type Price =
  | { status: "PAID"; money: Money }
  | { status: "FREE"; money: null }
  | { status: "UNAVAILABLE"; money: null; reasonCode?: string };

export type MoneyFormatLabels = Record<CurrencyCode, string>;
