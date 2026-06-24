import React from "react";
import { useLocalSearchParams } from "expo-router";
import PackagePurchasePayScreen from "../../../../src/features/patient/package-plans/components/PackagePurchasePayScreen";

export default function PackagePurchasePayRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PackagePurchasePayScreen purchaseId={typeof id === "string" ? id : ""} />;
}
