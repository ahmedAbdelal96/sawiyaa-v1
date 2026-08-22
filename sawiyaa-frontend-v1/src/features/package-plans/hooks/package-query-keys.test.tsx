import { describe, expect, it } from "vitest";
import { packageOfferQueryKeys } from "./use-package-offers";
import { packagePurchaseQueryKeys } from "./use-package-purchases";

describe("package projection query identities", () => {
  it("isolates public offer reads by locale while preserving the root prefix", () => {
    const arabic = packageOfferQueryKeys.list({ page: 1 }, "ar");
    const english = packageOfferQueryKeys.list({ page: 1 }, "en");

    expect(arabic).not.toEqual(english);
    expect(arabic.slice(0, packageOfferQueryKeys.all.length)).toEqual(
      packageOfferQueryKeys.all,
    );
  });

  it("isolates patient purchase list/detail reads by locale", () => {
    const arabicList = packagePurchaseQueryKeys.list({ page: 1 }, "ar");
    const englishList = packagePurchaseQueryKeys.list({ page: 1 }, "en");
    const arabicDetail = packagePurchaseQueryKeys.detail("purchase-1", "ar");
    const englishDetail = packagePurchaseQueryKeys.detail("purchase-1", "en");

    expect(arabicList).not.toEqual(englishList);
    expect(arabicDetail).not.toEqual(englishDetail);
    expect(arabicList.slice(0, packagePurchaseQueryKeys.all.length)).toEqual(
      packagePurchaseQueryKeys.all,
    );
    expect(arabicDetail.slice(0, packagePurchaseQueryKeys.all.length)).toEqual(
      packagePurchaseQueryKeys.all,
    );
  });
});
