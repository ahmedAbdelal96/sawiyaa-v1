import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import HeroSection from "@/features/home/components/HeroSection";
import InstantHelpBanner from "@/features/home/components/InstantHelpBanner";
import SpecialtiesSection from "@/features/home/components/SpecialtiesSection";
import PractitionersSection from "@/features/home/components/PractitionersSection";
import HowItWorksSection from "@/features/home/components/HowItWorksSection";
import WhySawiyaaSection from "@/features/home/components/WhySawiyaaSection";
import GuidedCareSection from "@/features/home/components/GuidedCareSection";
import FinalCTASection from "@/features/home/components/FinalCTASection";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public-pages.meta.home" });

  return buildPublicMetadata({
    locale,
    pathname: "/",
    title: t("title"),
    description: t("description"),
  });
}

export default async function HomePage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <HeroSection />
      <InstantHelpBanner />
      <SpecialtiesSection />
      <PractitionersSection />
      <HowItWorksSection />
      <WhySawiyaaSection />
      <GuidedCareSection />
      <FinalCTASection />
    </div>
  );
}