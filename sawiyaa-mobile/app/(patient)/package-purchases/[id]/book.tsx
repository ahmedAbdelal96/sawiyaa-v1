import PackageSessionBookingScreen from "../../../../src/features/patient/package-plans/components/PackageSessionBookingScreen";
import { useLocalSearchParams } from "expo-router";

export default function PackagePurchaseBookRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <PackageSessionBookingScreen
      purchaseId={typeof id === "string" ? id : ""}
    />
  );
}
