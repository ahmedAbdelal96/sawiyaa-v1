function resolvePatientMessagesLaneRoute(typeSlug: string | null | undefined) {
  if (typeSlug === "messages.session-message-received") {
    return "/(patient)/messages?tab=sessions";
  }

  if (typeSlug === "messages.support-message-received") {
    return "/(patient)/messages?tab=support";
  }

  if (typeSlug === "messages.follow-up-message-received") {
    return "/(patient)/messages?tab=followup";
  }

  return null;
}

export function resolvePatientNotificationRoute(
  href: string,
  typeSlug?: string | null,
) {
  const messageLaneRoute = resolvePatientMessagesLaneRoute(typeSlug);
  if (messageLaneRoute) {
    return messageLaneRoute;
  }

  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }

  const segments = trimmed.split("/").filter(Boolean);
  const patientIndex = segments.findIndex((segment) => segment === "patient");

  if (patientIndex === -1) {
    return null;
  }

  const target = segments.slice(patientIndex + 1);

  if (target.length === 0) {
    return null;
  }

  if (target[0] === "sessions") {
    if (target.length === 1) {
      return "/(patient)/sessions";
    }
    return `/(patient)/sessions/${target[1]}`;
  }

  if (target[0] === "messages") {
    if (target[1]) {
      return `/(patient)/messages/${target[1]}`;
    }
    return "/(patient)/messages";
  }

  if (target[0] === "payments" || target[0] === "wallet") {
    return "/(patient)/payments";
  }

  if (target[0] === "support") {
    if (target[1]) {
      return `/(patient)/support/${target[1]}`;
    }
    return "/(patient)/support";
  }

  if (target[0] === "care-chat") {
    if (target[1] === "conversations" && target[2]) {
      return `/(patient)/care-chat/${target[2]}`;
    }
    if (target[1] === "requests" && target[2]) {
      return `/(patient)/care-chat/request/${target[2]}`;
    }
    return "/(patient)/care-chat";
  }

  if (target[0] === "assessments") {
    return "/(patient)/assessments";
  }

  if (target[0] === "profile" || target[0] === "settings") {
    return "/(patient)/profile";
  }

  return null;
}
