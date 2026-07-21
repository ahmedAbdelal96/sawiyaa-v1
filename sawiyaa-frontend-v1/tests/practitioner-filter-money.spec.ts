import { expect, test } from "@playwright/test";
import { mapPractitionerFilterMoney } from "../src/features/practitioners-discovery/lib/practitioner-filter-money";
import { formatLocalizedMoney } from "../src/lib/money";

const labels = {
  USD: { en: "US Dollar", ar: "دولار أمريكي" },
  EGP: { en: "Egyptian Pound", ar: "جنيه مصري" },
};

test.describe("Practitioner filter money contract", () => {
  test("keeps the selected backend currency paired with its amount", () => {
    expect(
      mapPractitionerFilterMoney({ amount: 47, currencyCode: "USD" }),
    ).toEqual({ amount: "47", currencyCode: "USD" });
    expect(
      mapPractitionerFilterMoney({ amount: 1500, currencyCode: "EGP" }),
    ).toEqual({ amount: "1500", currencyCode: "EGP" });
  });

  test("does not construct a label from an incomplete or unsupported price", () => {
    expect(
      mapPractitionerFilterMoney({ amount: 47, currencyCode: null }),
    ).toBeNull();
    expect(
      mapPractitionerFilterMoney({ amount: 47, currencyCode: "EUR" }),
    ).toBeNull();
  });

  test("formats both selected bounds with the same backend currency in English and Arabic", () => {
    const usdBounds = [0, 47].map((amount) =>
      mapPractitionerFilterMoney({ amount, currencyCode: "USD" }),
    );
    const egpBounds = [0, 1500].map((amount) =>
      mapPractitionerFilterMoney({ amount, currencyCode: "EGP" }),
    );

    expect(usdBounds).toEqual([
      { amount: "0", currencyCode: "USD" },
      { amount: "47", currencyCode: "USD" },
    ]);
    expect(egpBounds).toEqual([
      { amount: "0", currencyCode: "EGP" },
      { amount: "1500", currencyCode: "EGP" },
    ]);

    const format = (money: NonNullable<(typeof usdBounds)[number]>, locale: "ar" | "en") =>
      formatLocalizedMoney({
        money,
        locale,
        labels: { USD: labels.USD[locale], EGP: labels.EGP[locale] },
      });

    expect(format(usdBounds[0]!, "en")).toBe("$0 USD");
    expect(format(usdBounds[1]!, "ar")).toBe("47 دولار أمريكي");
    expect(format(egpBounds[1]!, "en")).toBe("EGP 1,500");
    expect(format(egpBounds[1]!, "ar")).toBe("1,500 جنيه مصري");
  });
});
