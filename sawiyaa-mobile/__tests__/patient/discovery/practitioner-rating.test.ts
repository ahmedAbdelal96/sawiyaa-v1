import { hasPublicPractitionerRating } from "../../../src/features/patient/discovery/rating";

describe("hasPublicPractitionerRating", () => {
  test.each([
    [null, 0],
    [undefined, 0],
    [0, 0],
    [4.9, 0],
    [null, 12],
  ])("rejects an incomplete public rating (%s, %s)", (rating, reviewCount) => {
    expect(hasPublicPractitionerRating(rating, reviewCount)).toBe(false);
  });

  test("accepts a positive average with eligible reviews", () => {
    expect(hasPublicPractitionerRating(4.9, 12)).toBe(true);
  });
});
