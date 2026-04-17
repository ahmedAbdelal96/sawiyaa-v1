import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import ArticlesPreviewSection from "@/features/home/components/ArticlesPreviewSection";
import GuidedEntrySection from "@/features/home/components/GuidedEntrySection";
import HeroSection from "@/features/home/components/HeroSection";
import HowItWorksSection from "@/features/home/components/HowItWorksSection";
import PractitionersSection from "@/features/home/components/PractitionersSection";
import SpecialtiesSection from "@/features/home/components/SpecialtiesSection";
import WhyFayedSection from "@/features/home/components/WhyFayedSection";

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
      <GuidedEntrySection />
      <HowItWorksSection />
      <SpecialtiesSection />
      <PractitionersSection />
      <WhyFayedSection />
      <ArticlesPreviewSection locale={locale} />
    </>
  );
}
