const LOCALE_PREFIX_RE = /^\/(ar|en)(?=\/|$)/i;

function collapseSlashes(path) {
  return path.replace(/\/{2,}/g, "/");
}

function normalizeNotificationHref(href) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed.startsWith("/")) return null;
  let normalized = trimmed;
  while (LOCALE_PREFIX_RE.test(normalized)) {
    normalized = normalized.replace(LOCALE_PREFIX_RE, "") || "/";
  }
  normalized = collapseSlashes(normalized);
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function resolveNotificationClickTarget({ typeSlug, actionHref, payloadRoutePath, role }) {
  if (typeSlug === "messages.session-message-received") {
    return { kind: "messages-shell", lane: "session" };
  }

  if (typeSlug === "messages.support-message-received") {
    return { kind: "messages-shell", lane: "support" };
  }

  if (typeSlug === "messages.follow-up-message-received") {
    return { kind: "messages-shell", lane: "followup" };
  }

  const normalizedActionHref = normalizeNotificationHref(actionHref);
  const normalizedRoutePath = normalizeNotificationHref(payloadRoutePath);
  const href = normalizedActionHref ?? normalizedRoutePath;

  if (typeSlug.startsWith("sessions.session-")) {
    return { kind: "href", href: href ?? (role === "patient" ? "/patient/sessions" : "/practitioner/sessions") };
  }

  return { kind: "href", href: href ?? (role === "patient" ? "/patient" : "/practitioner") };
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\nExpected: ${e}\nActual:   ${a}`);
  }
}

assertEqual(
  normalizeNotificationHref("/ar/patient/messages/123"),
  "/patient/messages/123",
  "locale prefix should be stripped once",
);
assertEqual(
  normalizeNotificationHref("/ar/ar/patient/support/123"),
  "/patient/support/123",
  "duplicated locale should collapse",
);
assertEqual(
  normalizeNotificationHref("/en/en/patient/support/123"),
  "/patient/support/123",
  "duplicated english locale should collapse",
);
assertEqual(
  resolveNotificationClickTarget({
    typeSlug: "messages.session-message-received",
    actionHref: "/ar/patient/messages/123",
    payloadRoutePath: null,
    role: "patient",
  }),
  { kind: "messages-shell", lane: "session" },
  "session message should open messages shell, not care-chat",
);
assertEqual(
  resolveNotificationClickTarget({
    typeSlug: "messages.support-message-received",
    actionHref: "/ar/ar/patient/support/123",
    payloadRoutePath: null,
    role: "patient",
  }),
  { kind: "messages-shell", lane: "support" },
  "support message should open messages shell support lane and not route to support page",
);
assertEqual(
  resolveNotificationClickTarget({
    typeSlug: "messages.follow-up-message-received",
    actionHref: "/ar/patient/care-chat/123",
    payloadRoutePath: null,
    role: "patient",
  }),
  { kind: "messages-shell", lane: "followup" },
  "follow-up message should open messages shell followup lane and not route to care-chat",
);
assertEqual(
  resolveNotificationClickTarget({
    typeSlug: "messages.support-message-received",
    actionHref: "/ar/patient/care-chat/123",
    payloadRoutePath: "/ar/patient/support/123",
    role: "patient",
  }),
  { kind: "messages-shell", lane: "support" },
  "support message should not route to patient support page",
);
assertEqual(
  resolveNotificationClickTarget({
    typeSlug: "sessions.session-reminder-60",
    actionHref: "/en/en/patient/sessions/123",
    payloadRoutePath: null,
    role: "patient",
  }),
  { kind: "href", href: "/patient/sessions/123" },
  "session reminder should route to session details",
);
assertEqual(
  resolveNotificationClickTarget({
    typeSlug: "unknown.type",
    actionHref: null,
    payloadRoutePath: null,
    role: "patient",
  }),
  { kind: "href", href: "/patient" },
  "unknown notifications should fall back safely",
);

console.log("notification routing checks passed");
