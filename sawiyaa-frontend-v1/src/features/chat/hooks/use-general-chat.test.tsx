import { describe, expect, it } from "vitest";
import { generalChatQueryKeys } from "./use-general-chat";

describe("General Chat locale-sensitive query identity", () => {
  it("isolates the session conversation projection by locale while preserving its root", () => {
    const arabic = generalChatQueryKeys.sessionConversation("session-1", "ar");
    const english = generalChatQueryKeys.sessionConversation("session-1", "en");

    expect(arabic).toEqual([
      "general-chat",
      "session-conversation",
      "session-1",
      "ar",
    ]);
    expect(english).not.toEqual(arabic);
    expect(arabic.slice(0, 3)).toEqual([
      "general-chat",
      "session-conversation",
      "session-1",
    ]);
  });

  it("does not add locale to the message-body query identity", () => {
    expect(
      generalChatQueryKeys.messages("conversation-1", { page: 1 }),
    ).toEqual(["general-chat", "messages", "conversation-1", { page: 1 }]);
  });
});
