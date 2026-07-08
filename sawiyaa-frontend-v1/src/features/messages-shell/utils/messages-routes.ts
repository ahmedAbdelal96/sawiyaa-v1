export type MessagesRole = "patient" | "practitioner" | "admin";

export type MessagesLane =
  | "all"
  | "support"
  | "care"
  | "session"
  | "direct"
  | "followup";

export function getMessagesPath(
  locale: string | null | undefined,
  role: MessagesRole,
  params?: {
    lane?: MessagesLane;
    id?: string;
    relatedSessionId?: string;
  },
) {
  const prefix = locale ? `/${locale}` : "";
  const base =
    role === "patient"
      ? `${prefix}/patient/messages`
      : role === "practitioner"
        ? `${prefix}/practitioner/messages`
        : `${prefix}/admin/messages`;

  const search = new URLSearchParams();

  if (params?.lane && params.lane !== "all") {
    search.set("lane", params.lane);
  }

  if (params?.id) {
    search.set("id", params.id);
  }

  if (params?.relatedSessionId) {
    search.set("relatedSessionId", params.relatedSessionId);
  }

  const query = search.toString();

  return query ? `${base}?${query}` : base;
}
