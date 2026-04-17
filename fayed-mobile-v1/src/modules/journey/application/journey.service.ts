import { env } from "@/core/env";
import { getJourneyRequest } from "@/modules/journey/api/journey.api";
import type { JourneySummary } from "@/modules/journey/domain/journey.types";

function createMockJourney(): JourneySummary {
  return {
    suggestedNextAction: "START_GUIDED_MATCHING",
    nextSessionAt: null,
    hasPendingPayment: false,
    hasOpenSupportTicket: false,
    headline: "Journey snapshot",
    description:
      "This card keeps your next helpful step visible with the most relevant status flags.",
  };
}

function mapJourneySummary(input: {
  suggestedNextAction: string;
  nextSessionAt: string | null;
  hasPendingPayment: boolean;
  hasOpenSupportTicket: boolean;
}): JourneySummary {
  return {
    ...input,
    headline: "Journey snapshot",
    description:
      "This card keeps your next helpful step visible with the most relevant status flags.",
  };
}

export const journeyService = {
  async getSummary() {
    if (env.enableJourneyMock) {
      return createMockJourney();
    }

    const response = await getJourneyRequest();
    return mapJourneySummary(response.item.summary);
  },
};
