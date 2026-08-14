export function hasPublicPractitionerRating(
  rating: number | null | undefined,
  reviewCount: number | null | undefined,
): rating is number {
  return (
    typeof rating === "number" &&
    Number.isFinite(rating) &&
    rating > 0 &&
    typeof reviewCount === "number" &&
    reviewCount > 0
  );
}
