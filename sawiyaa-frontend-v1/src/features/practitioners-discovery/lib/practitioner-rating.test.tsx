import { describe, expect, it } from "vitest";
import { hasPublicPractitionerRating } from "./practitioner-rating";

describe("hasPublicPractitionerRating", () => {
  it.each([
    [null, 0],
    [undefined, 0],
    [0, 0],
    [4.9, 0],
    [null, 12],
  ])("rejects an incomplete public rating (%s, %s)", (rating, reviewCount) => {
    expect(hasPublicPractitionerRating(rating, reviewCount)).toBe(false);
  });

  it("accepts a positive average with eligible reviews", () => {
    expect(hasPublicPractitionerRating(4.9, 12)).toBe(true);
  });
});
