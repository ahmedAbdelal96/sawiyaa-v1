import React from "react";
import { useLocalSearchParams } from "expo-router";
import AcademyEnrollmentDetailScreen from "../../../../src/features/patient/academy/components/AcademyEnrollmentDetailScreen";
import { useTranslation } from "react-i18next";

export default function AcademyEnrollmentRoute() {
  const { id, token } = useLocalSearchParams<{ id: string; token: string }>();
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  return (
    <AcademyEnrollmentDetailScreen
      enrollmentId={typeof id === "string" ? id : ""}
      token={typeof token === "string" ? token : ""}
      locale={locale}
    />
  );
}
