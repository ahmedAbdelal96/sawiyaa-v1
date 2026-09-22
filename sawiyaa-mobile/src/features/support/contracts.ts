export const SUPPORT_TICKET_CATEGORIES = [
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
] as const;

export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];

export function normalizeSupportTicketCategory(
  value: string | string[] | undefined,
): SupportTicketCategory {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (SUPPORT_TICKET_CATEGORIES as readonly string[]).includes(candidate ?? "")
    ? (candidate as SupportTicketCategory)
    : "GENERAL";
}
