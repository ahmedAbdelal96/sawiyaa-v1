import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { LoadingState, Screen } from "../../../../src/components/ui";

export default function PractitionerCareChatRequestDetailScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(practitioner)/messages?tab=followup" as never);
  }, [router]);

  return (
    <Screen bg="background">
      <LoadingState fullScreen message="جارٍ التحويل..." />
    </Screen>
  );
}
