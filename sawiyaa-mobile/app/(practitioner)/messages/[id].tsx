import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ErrorState, Screen } from "../../../src/components/ui";
import { MessageThreadScreen } from "../../../src/features/messages/components/MessageThreadScreen";
import { PractitionerCareChatThreadScreen } from "../../../src/features/practitioner/care-chat/components/PractitionerCareChatThreadScreen";

export default function PractitionerMessageThreadScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; source?: string | string[] }>();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const source = Array.isArray(params.source) ? params.source[0] : params.source;

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

  if (source === "care") {
    return <PractitionerCareChatThreadScreen conversationId={conversationId} />;
  }

  return <MessageThreadScreen role="practitioner" conversationId={conversationId} />;
}
