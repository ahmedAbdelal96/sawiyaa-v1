import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ErrorState, Screen } from "../../../src/components/ui";
import { MessageThreadScreen } from "../../../src/features/messages/components/MessageThreadScreen";
import { PractitionerCareChatThreadScreen } from "../../../src/features/practitioner/care-chat/components/PractitionerCareChatThreadScreen";
import { getFirstRouteParam } from "../../../src/lib/route-params";

export default function PractitionerMessageThreadScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; source?: string | string[] }>();
  const conversationId = getFirstRouteParam(params.id);
  const source = getFirstRouteParam(params.source);

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
