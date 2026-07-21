import { parseMoney, type Price } from "@/lib/money";

type AcademyPublicPriceInput = {
  priceStatus?: "PAID" | "UNAVAILABLE" | null;
  priceAmount?: string | null;
  currencyCode?: string | null;
};

export function mapAcademyPublicPrice(input: AcademyPublicPriceInput): Price {
  if (input.priceStatus === "UNAVAILABLE") {
    return {
      status: "UNAVAILABLE",
      money: null,
      reasonCode: "SELECTED_PRICE_UNAVAILABLE",
    };
  }

  const money = parseMoney({ amount: input.priceAmount, currencyCode: input.currencyCode });
  return money
    ? Number(money.amount) > 0
      ? { status: "PAID", money }
      : {
          status: "UNAVAILABLE",
          money: null,
          reasonCode: "SELECTED_PRICE_INVALID",
        }
    : {
        status: "UNAVAILABLE",
        money: null,
        reasonCode: "SELECTED_PRICE_MISSING",
      };
}
