import type { Href } from "expo-router";

function withQuery(path: string, params: Record<string, string | undefined>) {
  const query = Object.entries(params)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return (query ? `${path}?${query}` : path) as Href;
}

export const routes = {
  public: {
    welcome: "/welcome" as Href,
    login: "/login" as Href,
    register: "/register" as Href,
  },
  app: {
    home: "/home" as Href,
    profile: "/profile" as Href,
    practitioners: "/practitioners" as Href,
    practitionerDetails: (slug: string) => `/practitioners/${slug}` as Href,
    bookingStart: (slug: string) => `/booking/new?slug=${encodeURIComponent(slug)}` as Href,
    bookingConfirm: (slug: string, startsAt: string, durationMinutes: 30 | 60) =>
      `/booking/confirm?slug=${encodeURIComponent(slug)}&startsAt=${encodeURIComponent(startsAt)}&durationMinutes=${durationMinutes}` as Href,
    matching: "/matching" as Href,
    matchingResult: (sessionId: string) => `/matching/${sessionId}` as Href,
    sessions: "/sessions" as Href,
    sessionDetails: (sessionId: string) => `/sessions/${sessionId}` as Href,
    sessionJoin: (sessionId: string) => `/sessions/${sessionId}/join` as Href,
    payments: "/payments" as Href,
    paymentDetails: (paymentId: string) => `/payments/${paymentId}` as Href,
    paymentCheckout: (sessionId: string) =>
      `/payments/checkout?sessionId=${encodeURIComponent(sessionId)}` as Href,
    paymentReturn: "/payments/return" as Href,
    paymentReturnFor: (paymentId: string) =>
      `/payments/return?paymentId=${encodeURIComponent(paymentId)}` as Href,
    supportTickets: "/support" as Href,
    supportNewTicket: "/support/new" as Href,
    supportNewTicketPrefilled: (params: {
      category?: string;
      relatedSessionId?: string;
      relatedPaymentId?: string;
      subject?: string;
      description?: string;
    }) => withQuery("/support/new", params),
    supportTicketDetails: (ticketId: string) => `/support/${ticketId}` as Href,
    careChatRequests: "/care-chat" as Href,
    careChatNewRequest: "/care-chat/new" as Href,
    careChatNewRequestPrefilled: (params: {
      slug?: string;
      relatedSessionId?: string;
      reason?: string;
    }) => withQuery("/care-chat/new", params),
    careChatNewRequestFor: (slug: string) =>
      `/care-chat/new?slug=${encodeURIComponent(slug)}` as Href,
    careChatRequestDetails: (requestId: string) => `/care-chat/requests/${requestId}` as Href,
    careChatConversation: (conversationId: string) =>
      `/care-chat/conversations/${conversationId}` as Href,
  },
} as const;
