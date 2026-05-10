import React from "react";
import { useLocalSearchParams } from "expo-router";
import PackagePurchaseDetailScreen from "../../../src/features/patient/package-plans/components/PackagePurchaseDetailScreen";

export default function PackagePurchaseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PackagePurchaseDetailScreen purchaseId={typeof id === "string" ? id : ""} />;
}
