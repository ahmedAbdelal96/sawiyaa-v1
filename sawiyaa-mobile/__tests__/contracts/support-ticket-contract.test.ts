import {
  normalizeSupportTicketCategory,
  SUPPORT_TICKET_CATEGORIES,
} from "../../src/features/support/contracts";

describe("support ticket contract", () => {
  it("accepts every backend enum value and defaults unknown values safely", () => {
    expect(SUPPORT_TICKET_CATEGORIES).toEqual([
      "BOOKING",
      "PAYMENT",
      "SESSION",
      "TECHNICAL",
      "ACCOUNT",
      "MATCHING",
      "GENERAL",
      "CONTENT",
      "CHAT",
      "OTHER",
    ]);
    expect(normalizeSupportTicketCategory("TECHNICAL")).toBe("TECHNICAL");
    expect(normalizeSupportTicketCategory("TECHNICAL_ISSUE")).toBe("GENERAL");
  });
});
