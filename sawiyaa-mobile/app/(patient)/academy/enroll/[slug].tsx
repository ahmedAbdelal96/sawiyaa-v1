import React from "react";
import { useLocalSearchParams } from "expo-router";
import AcademyEnrollmentCreateScreen from "../../../../src/features/patient/academy/components/AcademyEnrollmentCreateScreen";

export default function AcademyEnrollRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();

  return (
    <AcademyEnrollmentCreateScreen
      slug={typeof slug === "string" ? slug : ""}
    />
  );
}
