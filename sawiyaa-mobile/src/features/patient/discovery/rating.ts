export function hasPublicPractitionerRating(
  averageRating: number | null | undefined,
  totalReviews: number | null | undefined,
): averageRating is number {
  return (
    typeof averageRating === "number" &&
    Number.isFinite(averageRating) &&
    averageRating > 0 &&
    typeof totalReviews === "number" &&
    totalReviews > 0
  );
}
