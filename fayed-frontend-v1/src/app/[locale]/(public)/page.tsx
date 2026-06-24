import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import HeroSection from "@/features/home/components/HeroSection";
import ReassuranceStrip from "@/features/home/components/ReassuranceStrip";
import GuidedEntrySection from "@/features/home/components/GuidedEntrySection";
import WhySawiyaaSection from "@/features/home/components/WhySawiyaaSection";
import SpecialtiesSection from "@/features/home/components/SpecialtiesSection";
import HowItWorksSection from "@/features/home/components/HowItWorksSection";
import PractitionersSection from "@/features/home/components/PractitionersSection";
import GuidedCareSection from "@/features/home/components/GuidedCareSection";
import BookingClaritySection from "@/features/home/components/BookingClaritySection";
import ArticlesPreviewSection from "@/features/home/components/ArticlesPreviewSection";
import AcademyPreviewSection from "@/features/home/components/AcademyPreviewSection";
import PractitionerCTASection from "@/features/home/components/PractitionerCTASection";
import HelpPreviewSection from "@/features/home/components/HelpPreviewSection";
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

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  return (
    <>
      <HeroSection />
      <ReassuranceStrip />
      <PractitionersSection />
      <GuidedEntrySection />
      <WhySawiyaaSection />
      <SpecialtiesSection />
      <HowItWorksSection />
      <GuidedCareSection />
      <BookingClaritySection />
      <ArticlesPreviewSection locale={locale} />
      <AcademyPreviewSection locale={locale} />
      <PractitionerCTASection />
      <HelpPreviewSection />
      <FinalCTASection />
    </>
  );
}