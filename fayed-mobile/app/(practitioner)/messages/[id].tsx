import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ErrorState, Screen } from "../../../src/components/ui";
import { MessageThreadScreen } from "../../../src/features/messages/components/MessageThreadScreen";

export default function PractitionerMessageThreadScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!conversationId) {
    return (
      <Screen bg="background">
        <ErrorState
          fullScreen
          title="Conversation unavailable"
          message="We could not open this conversation."
        />
      </Screen>
    );
  }

  return <MessageThreadScreen role="practitioner" conversationId={conversationId} />;
}
