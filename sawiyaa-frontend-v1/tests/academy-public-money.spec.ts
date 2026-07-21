import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapAcademyPublicPrice } from "../src/features/academy/lib/academy-public-price";
import { formatLocalizedMoney } from "../src/lib/money";

const labels = {
  USD: { en: "US Dollar", ar: "دولار أمريكي" },
  EGP: { en: "Egyptian Pound", ar: "جنيه مصري" },
};

function formatMoney(amount: string, currencyCode: "EGP" | "USD", locale: "ar" | "en") {
  return formatLocalizedMoney({
    money: { amount, currencyCode },
    locale,
    labels: {
      USD: labels.USD[locale],
      EGP: labels.EGP[locale],
    },
  });
}

function pricingCopy(locale: "ar" | "en") {
  const source = readFileSync(
    resolve(__dirname, `../messages/${locale}/common.json`),
    "utf8",
  );
  return JSON.parse(source).money.pricing as {
    free: string;
    unavailable: string;
  };
}

test.describe("Public Academy money contract", () => {
  test("uses the backend-selected paid price and ignores legacy regional fields", () => {
    const price = mapAcademyPublicPrice({
      priceAmount: "20.00",
      currencyCode: "USD",
      priceEgp: "500.00",
      priceUsd: "20.00",
    });

    expect(price).toEqual({
      status: "PAID",
      money: { amount: "20.00", currencyCode: "USD" },
    });
  });

  test("maps paid USD and EGP selections without converting or relabeling them", () => {
    expect(
      mapAcademyPublicPrice({ priceAmount: "20.00", currencyCode: "USD" }),
    ).toEqual({
      status: "PAID",
      money: { amount: "20.00", currencyCode: "USD" },
    });
    expect(
      mapAcademyPublicPrice({ priceAmount: "500.00", currencyCode: "EGP" }),
    ).toEqual({
      status: "PAID",
      money: { amount: "500.00", currencyCode: "EGP" },
    });
  });

  test("uses the centralized unavailable translation for both locales", () => {
    expect(pricingCopy("en")).toMatchObject({
      unavailable: "Price unavailable",
    });
    expect(pricingCopy("ar")).toMatchObject({
      unavailable: "تعذر عرض السعر حالياً",
    });
  });

  test("treats missing or malformed selected prices as unavailable, never free", () => {
    expect(mapAcademyPublicPrice({ priceStatus: "UNAVAILABLE" })).toMatchObject({
      status: "UNAVAILABLE",
    });
    expect(mapAcademyPublicPrice({})).toMatchObject({
      status: "UNAVAILABLE",
      reasonCode: "SELECTED_PRICE_MISSING",
    });
    expect(
      mapAcademyPublicPrice({ priceAmount: "20.00", currencyCode: "EUR" }),
    ).toMatchObject({ status: "UNAVAILABLE" });
    expect(
      mapAcademyPublicPrice({ priceAmount: "0", currencyCode: "USD" }),
    ).toMatchObject({ status: "UNAVAILABLE" });
    expect(
      mapAcademyPublicPrice({ priceAmount: "-20.00", currencyCode: "USD" }),
    ).toMatchObject({ status: "UNAVAILABLE" });
    expect(
      mapAcademyPublicPrice({ priceAmount: "invalid", currencyCode: "USD" }),
    ).toMatchObject({ status: "UNAVAILABLE" });
    expect(
      mapAcademyPublicPrice({ priceAmount: "20.00" }),
    ).toMatchObject({ status: "UNAVAILABLE" });
  });

  test("central Academy presentation produces safe English and Arabic money text", () => {
    const output = [
      formatMoney("20", "USD", "en"),
      formatMoney("500", "EGP", "en"),
      formatMoney("20", "USD", "ar"),
      formatMoney("500", "EGP", "ar"),
    ];

    expect(output).toEqual([
      "$20 USD",
      "EGP 500",
      "20 دولار أمريكي",
      "500 جنيه مصري",
    ]);
    for (const value of output) {
      expect(value).not.toMatch(/\$US|SUS|USD\$|US\$|NaN|undefined/);
    }
  });

  test("never maps the current Academy API contract to Free", () => {
    const currentContractPrices = [
      { priceStatus: "PAID" as const, priceAmount: "20", currencyCode: "USD" },
      { priceStatus: "UNAVAILABLE" as const, priceAmount: null, currencyCode: null },
      { priceAmount: "0", currencyCode: "USD" },
      { priceAmount: null, currencyCode: null },
    ];

    for (const input of currentContractPrices) {
      expect(mapAcademyPublicPrice(input).status).not.toBe("FREE");
    }
  });
});
