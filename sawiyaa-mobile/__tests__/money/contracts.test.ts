import { formatMoney, parseAcademyPrice, parseMoney, parsePrice } from "../../src/lib/money";

describe("mobile money contract", () => {
  it("formats authoritative EGP and USD amounts consistently in English and Arabic", () => {
    expect(formatMoney(parseMoney("500.00", "EGP")!, "en")).toBe("EGP 500");
    expect(formatMoney(parseMoney("20.50", "USD")!, "en")).toBe("$20.50 USD");
    expect(formatMoney(parseMoney("500", "EGP")!, "ar")).toBe("500 جنيه مصري");
    expect(formatMoney(parseMoney("20", "USD")!, "ar")).toBe("20 دولار أمريكي");
  });

  it("does not invent money for missing, malformed, or unsupported currency values", () => {
    expect(parseMoney("20", "EUR")).toBeNull();
    expect(parseMoney("20.000", "USD")).toBeNull();
    expect(parseMoney("", "EGP")).toBeNull();
    expect(parsePrice({ priceStatus: "PAID", priceAmount: null, currencyCode: "USD" }).status).toBe("UNAVAILABLE");
  });

  it("only returns academy PAID for an explicit paid, positive selected amount", () => {
    expect(parseAcademyPrice({ priceStatus: "PAID", priceAmount: "310", currencyCode: "EGP" })).toEqual({ status: "PAID", money: { amount: "310", currencyCode: "EGP" } });
    expect(parseAcademyPrice({ priceStatus: "PAID", priceAmount: null, currencyCode: "EGP" }).status).toBe("UNAVAILABLE");
    expect(parseAcademyPrice({ priceStatus: "FREE", priceAmount: "0", currencyCode: "EGP" }).status).toBe("UNAVAILABLE");
    expect(parseAcademyPrice({ priceStatus: "PAID", priceAmount: "0", currencyCode: "EGP" }).status).toBe("UNAVAILABLE");
  });
});
