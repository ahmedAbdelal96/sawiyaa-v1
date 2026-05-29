import React from "react";
import { useLocalSearchParams } from "expo-router";
import { MessagesInboxScreen } from "../../../src/features/messages/components/MessagesInboxScreen";

const VALID_TABS = ["all", "sessions", "support", "followup"] as const;
type ValidTab = (typeof VALID_TABS)[number];

export default function PatientMessagesIndexScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab: ValidTab | undefined =
    typeof tab === "string" && VALID_TABS.includes(tab as ValidTab)
      ? (tab as ValidTab)
      : undefined;

  return (
    <MessagesInboxScreen role="patient" initialTab={initialTab} />
  );
}
