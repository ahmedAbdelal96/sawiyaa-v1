"use client";

export const OPEN_SESSION_CHAT_EVENT = "fayed:messages-shell-open-session-chat";
export const TOGGLE_MESSAGES_SHELL_EVENT = "fayed:messages-shell-toggle";

export type OpenSessionChatEventPayload = {
  sessionId: string;
};

export type ToggleMessagesShellEventPayload = {
  anchorRect?: Pick<DOMRect, "top" | "left" | "right" | "bottom">;
};

export function dispatchOpenSessionChatInShell(payload: OpenSessionChatEventPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OpenSessionChatEventPayload>(OPEN_SESSION_CHAT_EVENT, { detail: payload }));
}

export function listenOpenSessionChatInShell(
  handler: (payload: OpenSessionChatEventPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<OpenSessionChatEventPayload>;
    if (!customEvent.detail?.sessionId) return;
    handler(customEvent.detail);
  };

  window.addEventListener(OPEN_SESSION_CHAT_EVENT, listener as EventListener);

  return () => {
    window.removeEventListener(OPEN_SESSION_CHAT_EVENT, listener as EventListener);
  };
}

export function dispatchToggleMessagesShell(
  payload?: ToggleMessagesShellEventPayload,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToggleMessagesShellEventPayload>(
      TOGGLE_MESSAGES_SHELL_EVENT,
      { detail: payload },
    ),
  );
}

export function listenToggleMessagesShell(
  handler: (payload?: ToggleMessagesShellEventPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<ToggleMessagesShellEventPayload>;
    handler(customEvent.detail);
  };

  window.addEventListener(TOGGLE_MESSAGES_SHELL_EVENT, listener);

  return () => {
    window.removeEventListener(TOGGLE_MESSAGES_SHELL_EVENT, listener);
  };
}
