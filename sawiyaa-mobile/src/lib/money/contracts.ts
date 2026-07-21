export type CurrencyCode = "EGP" | "USD";

export type Money = Readonly<{
  amount: string;
  currencyCode: CurrencyCode;
}>;

export type PriceStatus = "PAID" | "FREE" | "UNAVAILABLE";

export type Price = Readonly<{
  status: PriceStatus;
  money: Money | null;
}>;

/** Academy currently has no free-course business state. */
export type AcademyPrice = Readonly<{
  status: "PAID" | "UNAVAILABLE";
  money: Money | null;
}>;
