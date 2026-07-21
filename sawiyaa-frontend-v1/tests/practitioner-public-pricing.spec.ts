import { expect, test } from "@playwright/test";
import {
  formatPublicMoney,
  getPublicSessionPrices,
} from "../src/features/practitioners-discovery/lib/public-pricing";

test.describe("Public practitioner selected pricing", () => {
  test("renders the backend-selected USD amounts, never configured EGP amounts", () => {
    const prices = getPublicSessionPrices({
      sessionPrice30: 25,
      sessionPrice60: 45,
    });

    expect(prices).toEqual([
      { duration: 30, amount: 25 },
      { duration: 60, amount: 45 },
    ]);
    expect(formatPublicMoney("ar", prices[0].amount, "USD")).toBe(
      "25 دولار أمريكي",
    );
    expect(formatPublicMoney("en", prices[1].amount, "USD")).toBe(
      "$45 USD",
    );
  });

  test("does not render a price when the backend-selected currency amount is absent", () => {
    expect(
      getPublicSessionPrices({
        sessionPrice30: null,
        sessionPrice60: null,
      }),
    ).toEqual([]);
  });
});
