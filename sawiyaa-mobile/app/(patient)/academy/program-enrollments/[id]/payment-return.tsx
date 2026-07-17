import React from "react";
import { useLocalSearchParams } from "expo-router";
import AcademyEnrollmentPaymentReturnScreen from "../../../../../src/features/patient/academy/components/AcademyEnrollmentPaymentReturnScreen";
import { useTranslation } from "react-i18next";

export default function AcademyProgramEnrollmentPaymentReturnRoute() {
  const { id, token } = useLocalSearchParams<{ id: string; token: string }>();
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";

  return (
    <AcademyEnrollmentPaymentReturnScreen
      enrollmentId={typeof id === "string" ? id : ""}
      token={typeof token === "string" ? token : ""}
      locale={locale}
    />
  );
}
