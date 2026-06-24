import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { LoadingState, Screen } from "../../../src/components/ui";

export default function PractitionerSupportListScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(practitioner)/messages?tab=support" as any);
  }, [router]);

  return (
    <Screen bg="background">
      <LoadingState fullScreen />
    </Screen>
  );
}
