import { describe, expect, it } from "vitest";
import { packageOfferQueryKeys } from "./use-package-offers";
import { packagePurchaseQueryKeys } from "./use-package-purchases";
import { packagePlanQueryKeys } from "./use-package-plans";

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

  it("isolates practitioner discovery reads by practitioner and quote context", () => {
    const doctorA = packagePlanQueryKeys.publicByPractitionerSlug(
      "doctor-a",
      { durationMinutes: 60, sessionMode: "VIDEO" },
      "guest",
    );
    const doctorB = packagePlanQueryKeys.publicByPractitionerSlug(
      "doctor-b",
      { durationMinutes: 60, sessionMode: "VIDEO" },
      "guest",
    );
    expect(doctorA).not.toEqual(doctorB);
    expect(doctorA.slice(0, packagePlanQueryKeys.all.length)).toEqual(
      packagePlanQueryKeys.all,
    );
  });

  it("invalidates a changed duration as a distinct discovery quote", () => {
    const video = packagePlanQueryKeys.publicByPractitionerSlug(
      "doctor-a",
      { durationMinutes: 60, sessionMode: "VIDEO" },
      "guest",
    );
    const audio = packagePlanQueryKeys.publicByPractitionerSlug(
      "doctor-a",
      { durationMinutes: 30, sessionMode: "VIDEO" },
      "guest",
    );
    expect(video).not.toEqual(audio);
  });
});
