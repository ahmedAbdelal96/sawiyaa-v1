import React from "react";
import {
  PublicPageContainer,
  PublicHeader,
  PublicHero,
  PublicTrustRow,
  PublicPractitionerSignIn,
} from "../../src/features/public/components";

export default function PublicHomeScreen() {
  return (
    <PublicPageContainer>
      {/* 1. Compact Header */}
      <PublicHeader />

      {/* 2. Compact Hero (Title, Description, Primary CTA, Secondary CTA) */}
      <PublicHero />

      {/* 3. Compact Trust Row (3 Reassurance Points) */}
      <PublicTrustRow />

      {/* 4. Quiet Practitioner Sign In Link */}
      <PublicPractitionerSignIn />
    </PublicPageContainer>
  );
}
