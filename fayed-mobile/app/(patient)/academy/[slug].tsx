import React from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import AcademyDetailScreen from "../../../src/features/patient/academy/components/AcademyDetailScreen";

export default function AcademyDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  return (
    <AcademyDetailScreen
      slug={typeof slug === "string" ? slug : ""}
      locale={locale}
    />
  );
}
