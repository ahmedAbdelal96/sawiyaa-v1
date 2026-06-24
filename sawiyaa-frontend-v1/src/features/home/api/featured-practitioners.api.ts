import { serverGet } from "@/lib/api/server-http-client";

export type FeaturedPractitionerHomeCard = {
  practitionerId: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  avatarUrl: string | null;
  primarySpecialty: string | null;
  averageRating: number | null;
  totalReviews: number;
  displaySessionPrice30: number | null;
  displaySessionPrice60: number | null;
  isVerified: boolean;
  badgeLabel: string;
};

export async function fetchPublicFeaturedPractitioners(
  locale: string,
): Promise<FeaturedPractitionerHomeCard[]> {
  return serverGet<FeaturedPractitionerHomeCard[]>(
    "/public/featured-practitioners",
    {
      locale,
      params: {},
    },
  );
}
