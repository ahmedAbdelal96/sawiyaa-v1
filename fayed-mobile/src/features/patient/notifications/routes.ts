export function resolvePatientNotificationRoute(href: string) {
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  // Reject absolute URLs and unsafe protocols from notification payloads.
  // We only accept internal app paths like "/patient/sessions/123".
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

  if (target[0] === "payments" || target[0] === "wallet") {
    return "/(patient)/payments";
  }

  if (target[0] === "support") {
    return target[1] ? `/(patient)/support/${target[1]}` : "/(patient)/support";
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
