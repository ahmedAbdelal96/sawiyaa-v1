import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import SessionChatPanel from "./SessionChatPanel";

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "ar",
  useTranslations: () => (key: string) => {
    if (key.includes("fallbackName")) return "المعالج";
    if (key.includes("states.empty.heading")) return "لا توجد رسائل بعد";
    if (key.includes("states.availabilityLoading.heading")) return "جاري تحميل حالة المحادثة";
    return key;
  },
}));

// Mock navigation Link
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock hooks
vi.mock("@/features/users/hooks/use-users", () => ({
  useCurrentUser: () => ({ data: { userId: "user_patient" }, isLoading: false }),
}));

vi.mock("@/features/sessions/hooks/use-sessions", () => ({
  usePatientSession: () => ({
    data: {
      id: "session-1",
      chatAvailability: { canRead: true, canSend: true, readOnly: false },
      practitioner: { displayName: "Dr. Ahmed" },
    },
    isLoading: false,
    isError: false,
  }),
  usePractitionerSession: () => ({ data: null, isLoading: false }),
}));

vi.mock("../hooks/use-general-chat", () => ({
  useOpenSessionGeneralChat: vi.fn(),
  useGeneralChatMessages: vi.fn(),
  useSendGeneralChatMessage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUploadGeneralChatAttachment: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCloseGeneralChatConversation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("../hooks/use-session-chat-realtime", () => ({
  useSessionChatRealtime: ({ serverMessages }: any) => ({
    messages: serverMessages,
    reportTypingActivity: vi.fn(),
    sendMessage: vi.fn(),
    isPeerTyping: false,
  }),
}));

import { useOpenSessionGeneralChat, useGeneralChatMessages } from "../hooks/use-general-chat";

describe("SessionChatPanel Component", () => {
  const renderWithQueryClient = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };
  const mockMessages = [
    {
      messageId: "msg-1",
      contentText: "Hello there!",
      sentAt: "2026-07-26T12:00:00.000Z",
      senderUserId: "user_practitioner",
      attachments: [],
    },
  ];

  it("1. & 7. Existing conversation opens and renders previous messages correctly", async () => {
    (useOpenSessionGeneralChat as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        item: {
          conversationId: "conv-1",
          conversationRef: "ref-1",
          chatAvailability: { canRead: true, canSend: true, readOnly: false },
        },
      }),
      isPending: false,
      isError: false,
    });

    (useGeneralChatMessages as any).mockReturnValue({
      data: { items: mockMessages },
      isLoading: false,
      isError: false,
    });

    renderWithQueryClient(<SessionChatPanel sessionId="session-1" scope="patient" variant="embedded" />);

    // Renders messages successfully by waiting for the state update
    expect(await screen.findByText("Hello there!")).toBeDefined();
  });

  it("6. No false 'no messages' empty state displays while conversationId is resolving (loading state)", () => {
    (useOpenSessionGeneralChat as any).mockReturnValue({
      mutateAsync: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves to keep conversationId null
      isPending: true, // open is pending
      isError: false,
    });

    (useGeneralChatMessages as any).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    renderWithQueryClient(<SessionChatPanel sessionId="session-1" scope="patient" variant="embedded" />);

    // Should show loading spinner/skeleton/text, NOT empty state
    expect(screen.queryByText("لا توجد رسائل بعد")).toBeNull();
    expect(screen.getByText("جاري التحميل...")).toBeDefined();
  });
});
