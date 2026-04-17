export type JourneySummary = {
  suggestedNextAction:
    | "COMPLETE_PAYMENT"
    | "JOIN_UPCOMING_SESSION"
    | "VIEW_SUPPORT_TICKET"
    | "BOOK_NEXT_SESSION"
    | "START_GUIDED_MATCHING"
    | "TAKE_ASSESSMENT"
    | string;
  nextSessionAt: string | null;
  hasPendingPayment: boolean;
  hasOpenSupportTicket: boolean;
  headline: string;
  description: string;
};

export type JourneyApiResponse = {
  item: {
    summary: {
      suggestedNextAction: string;
      nextSessionAt: string | null;
      hasPendingPayment: boolean;
      hasOpenSupportTicket: boolean;
    };
  };
};
