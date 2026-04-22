import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const WEB_URL = "http://localhost:19007";
const API_URL = "http://localhost:7000/api/v1";
const AUTH_SESSION_KEY = "fayed.mobile.auth.session.v1";
const DEVICE_ID_KEY = "fayed.mobile.device.id.v1";
const OUT_DIR = path.resolve(
  "D:/Web/full-projects/fayed/fayed-mobile/artifacts/auth-bootstrap-race-smoke",
);
const backendRequire = createRequire(
  "D:/Web/full-projects/fayed/fayed-backend-v1/package.json",
);
const { PrismaClient } = backendRequire("@prisma/client");

const patientCreds = {
  email: "ahmed.patient@hesba.local",
  password: "Patient@12345",
  deviceId: "auth-race-smoke-patient-device",
};

const adminCreds = {
  email: "admin@hesba.local",
  password: "Admin@12345",
  deviceId: "auth-race-smoke-admin-device",
};

const practitionerCandidates = [
  {
    email: "dr.ahmed@hesba.local",
    password: "Practitioner@12345",
    deviceId: "auth-race-smoke-practitioner-a",
  },
  {
    email: "dr.mohamed@hesba.local",
    password: "Practitioner2@12345",
    deviceId: "auth-race-smoke-practitioner-b",
  },
  {
    email: "dr.mahmoud@hesba.local",
    password: "Practitioner3@12345",
    deviceId: "auth-race-smoke-practitioner-c",
  },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function api(pathname, options = {}) {
  const response = await fetch(`${API_URL}${pathname}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-lang": "ar",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${pathname} failed: ${response.status} ${text}`,
    );
  }

  return body?.data ?? body;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractOtpCode(bodySnapshot) {
  const match = String(bodySnapshot ?? "").match(/(\d{4,8})/);
  if (!match) {
    throw new Error(
      `Unable to extract OTP code from notification body: ${bodySnapshot}`,
    );
  }
  return match[1];
}

async function waitForPractitionerOtp(prisma, practitionerEmail, startedAt) {
  const normalizedEmail = practitionerEmail.trim().toLowerCase();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const userEmail = await prisma.userEmail.findUnique({
      where: { email: normalizedEmail },
      select: { userId: true },
    });

    if (!userEmail?.userId) {
      throw new Error(
        `No user found for practitioner email ${practitionerEmail}`,
      );
    }

    const notification = await prisma.notification.findFirst({
      where: {
        userId: userEmail.userId,
        createdAt: { gte: startedAt },
        notificationType: {
          slug: "auth.practitioner-login-otp",
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        bodySnapshot: true,
        createdAt: true,
      },
    });

    if (notification?.bodySnapshot) {
      return extractOtpCode(notification.bodySnapshot);
    }

    await sleep(500);
  }

  throw new Error(
    `Timed out waiting for practitioner OTP notification for ${practitionerEmail}`,
  );
}

async function loginPatient() {
  const payload = await api("/auth/patient/login", {
    method: "POST",
    body: JSON.stringify(patientCreds),
  });

  return {
    role: "patient",
    user: payload.user,
    tokens: payload.tokens,
  };
}

async function loginAdmin() {
  const payload = await api("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify(adminCreds),
  });

  return payload.tokens.accessToken;
}

async function loginPractitioner(prisma, creds) {
  const startedAt = new Date();
  const challenge = await api("/auth/practitioner/login", {
    method: "POST",
    body: JSON.stringify({
      email: creds.email,
      password: creds.password,
    }),
  });
  const code = await waitForPractitionerOtp(prisma, creds.email, startedAt);
  const payload = await api("/auth/practitioner/login/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      code,
      deviceId: creds.deviceId,
    }),
  });

  return {
    role: "practitioner",
    user: payload.user,
    tokens: payload.tokens,
  };
}

async function getPublicPractitioners() {
  const payload = await api("/public/practitioners?limit=25", {
    method: "GET",
  });
  return payload.items ?? [];
}

async function listSupport(accessToken) {
  const payload = await api("/patients/me/support/tickets?page=1&limit=50", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return payload.items ?? [];
}

async function createSupportTicket(accessToken, subjectSuffix) {
  const payload = await api("/patients/me/support/tickets", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      category: "GENERAL",
      subject: `Auth bootstrap smoke ${subjectSuffix}`,
      description: "Focused auth bootstrap smoke validation ticket.",
    }),
  });
  return payload.item;
}

async function listCareRequests(accessToken) {
  const payload = await api("/patients/me/care-chat/requests?page=1&limit=50", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return payload.items ?? [];
}

async function createCareRequest(accessToken, practitionerSlug, suffix) {
  const payload = await api("/patients/me/care-chat/requests", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      practitionerSlug,
      reason: `Auth bootstrap smoke request ${suffix}`,
    }),
  });
  return payload.item;
}

async function approveCareRequest(adminAccessToken, requestId) {
  const payload = await api(`/admin/care-chat/requests/${requestId}/decision`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminAccessToken}` },
    body: JSON.stringify({
      decision: "APPROVE",
      note: "Approved for focused auth bootstrap smoke verification.",
    }),
  });
  return payload.item;
}

async function sendCareMessage(accessToken, conversationId, message) {
  await api(`/patients/me/care-chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ message }),
  });
}

async function choosePractitionerSession(prisma) {
  for (const creds of practitionerCandidates) {
    const session = await loginPractitioner(prisma, creds);
    const sessionsPayload = await api("/practitioners/me/sessions?limit=20", {
      headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
    });
    const items = sessionsPayload.items ?? [];
    if (items.length > 0) {
      return {
        session,
        sessionId: items[0].id,
      };
    }
  }

  throw new Error(
    "No seeded practitioner with an accessible session was found for smoke verification.",
  );
}

async function preparePatientTargets(patientSession, adminAccessToken) {
  const accessToken = patientSession.tokens.accessToken;
  const supportTickets = await listSupport(accessToken);
  const supportTicket =
    supportTickets[0] ?? (await createSupportTicket(accessToken, Date.now()));

  const careRequests = await listCareRequests(accessToken);
  const activePractitionerIds = new Set(
    careRequests
      .filter((item) => item.status === "PENDING" || item.status === "APPROVED")
      .map((item) => item.practitioner.id),
  );
  const practitioners = await getPublicPractitioners();
  const availablePractitioners = practitioners.filter(
    (item) => !activePractitionerIds.has(item.id),
  );

  if (availablePractitioners.length === 0 && careRequests.length === 0) {
    throw new Error(
      "No practitioner was available to create care chat smoke data.",
    );
  }

  let requestDetail = careRequests.find((item) => item.status === "PENDING");
  if (!requestDetail) {
    const practitioner = availablePractitioners[0] ?? practitioners[0];
    requestDetail = await createCareRequest(
      accessToken,
      practitioner.slug,
      `${Date.now()}-pending`,
    );
  }

  let approvedRequest = careRequests.find(
    (item) => item.status === "APPROVED" && item.linkedConversationId,
  );

  if (!approvedRequest) {
    const usedIds = new Set([
      requestDetail.practitioner.id,
      ...careRequests.map((item) => item.practitioner.id),
    ]);
    const approvalTarget =
      practitioners.find((item) => !usedIds.has(item.id)) ??
      availablePractitioners[1] ??
      availablePractitioners[0] ??
      practitioners[0];

    const created = await createCareRequest(
      accessToken,
      approvalTarget.slug,
      `${Date.now()}-approved`,
    );
    approvedRequest = await approveCareRequest(adminAccessToken, created.id);
    if (approvedRequest.linkedConversationId) {
      await sendCareMessage(
        accessToken,
        approvedRequest.linkedConversationId,
        "Focused auth bootstrap smoke conversation message.",
      );
    }
  }

  if (!approvedRequest?.linkedConversationId) {
    throw new Error(
      "Unable to resolve an approved care chat conversation for smoke verification.",
    );
  }

  return {
    supportTicketId: supportTicket.id,
    careRequestId: requestDetail.id,
    approvedConversationId: approvedRequest.linkedConversationId,
  };
}

function buildPersistedSession(session) {
  return JSON.stringify({
    role: session.role,
    user: session.user,
    tokens: session.tokens,
  });
}

function isTrackedApiUrl(url) {
  if (!url.startsWith(API_URL)) {
    return false;
  }

  return (
    url.includes("/auth/me") ||
    url.includes("/patients/") ||
    url.includes("/practitioners/")
  );
}

function isProtectedDomain(url) {
  return url.includes("/patients/") || url.includes("/practitioners/");
}

async function navigateAndObserve(page, spec, apiLog, pageIssues) {
  const expected = Array.isArray(spec.expect) ? spec.expect : [spec.expect];
  const waits = expected.filter(Boolean).map((fragment) =>
    page
      .waitForResponse((response) => response.url().includes(fragment), {
        timeout: spec.timeoutMs ?? 15000,
      })
      .then(() => null)
      .catch(() => fragment),
  );

  const startedAt = Date.now();
  await page.goto(`${WEB_URL}${spec.route}`, { waitUntil: "domcontentloaded" });

  const timedOutExpected = (await Promise.all(waits)).filter(Boolean);

  await page
    .waitForLoadState("networkidle", { timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(750);

  return {
    name: spec.name,
    route: spec.route,
    elapsedMs: Date.now() - startedAt,
    matchedResponses: apiLog
      .filter((entry) =>
        expected.some((fragment) => fragment && entry.url.includes(fragment)),
      )
      .map((entry) => ({ url: entry.url, status: entry.status })),
    timedOutExpected,
    pageIssues: [...pageIssues],
  };
}

async function runSweep(role, session, pages) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ar-EG" });
  const apiLog = [];
  const pageIssues = [];

  await context.addInitScript(
    ({ authSessionKey, deviceIdKey, persistedSession, deviceId }) => {
      window.localStorage.setItem(authSessionKey, persistedSession);
      window.localStorage.setItem(deviceIdKey, deviceId);
    },
    {
      authSessionKey: AUTH_SESSION_KEY,
      deviceIdKey: DEVICE_ID_KEY,
      persistedSession: buildPersistedSession(session),
      deviceId: `${role}-browser-device`,
    },
  );

  const page = await context.newPage();
  page.on("pageerror", (error) => {
    pageIssues.push({ type: "pageerror", message: error.message });
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      pageIssues.push({ type: "console", message: message.text() });
    }
  });
  page.on("response", async (response) => {
    const url = response.url();
    if (!isTrackedApiUrl(url)) {
      return;
    }
    apiLog.push({
      url,
      status: response.status(),
      method: response.request().method(),
    });
  });

  const results = [];
  for (const spec of pages) {
    results.push(await navigateAndObserve(page, spec, apiLog, pageIssues));
  }

  await context.close();
  await browser.close();

  const protected401s = apiLog.filter(
    (entry) => entry.status === 401 && isProtectedDomain(entry.url),
  );
  const authMeResponses = apiLog.filter((entry) =>
    entry.url.includes("/auth/me"),
  );

  return {
    role,
    pages: results,
    protected401s,
    authMeResponses,
    pageIssues,
    apiLog,
  };
}

async function main() {
  await ensureDir(OUT_DIR);

  const prisma = new PrismaClient();
  try {
    const patientSession = await loginPatient();
    const adminAccessToken = await loginAdmin();
    const patientTargets = await preparePatientTargets(
      patientSession,
      adminAccessToken,
    );
    const practitionerTarget = await choosePractitionerSession(prisma);

    const patientPages = [
      {
        name: "patient-home",
        route: "/",
        expect: ["/auth/me", "/patients/me/journey"],
      },
      {
        name: "patient-support-list",
        route: "/support",
        expect: "/patients/me/support/tickets",
      },
      {
        name: "patient-support-new",
        route: "/support/new",
        expect: "/auth/me",
      },
      {
        name: "patient-support-detail",
        route: `/support/${patientTargets.supportTicketId}`,
        expect: `/patients/me/support/tickets/${patientTargets.supportTicketId}`,
      },
      {
        name: "patient-care-chat-list",
        route: "/care-chat",
        expect: "/patients/me/care-chat/requests",
      },
      {
        name: "patient-care-chat-new",
        route: "/care-chat/new",
        expect: "/auth/me",
      },
      {
        name: "patient-care-chat-request-detail",
        route: `/care-chat/request/${patientTargets.careRequestId}`,
        expect: `/patients/me/care-chat/requests/${patientTargets.careRequestId}`,
      },
      {
        name: "patient-care-chat-conversation",
        route: `/care-chat/${patientTargets.approvedConversationId}`,
        expect: `/patients/me/care-chat/conversations/${patientTargets.approvedConversationId}`,
      },
    ];

    const practitionerPages = [
      {
        name: "practitioner-home",
        route: "/",
        expect: ["/auth/me", "/practitioners/me", "/practitioners/me/sessions"],
      },
      {
        name: "practitioner-sessions-list",
        route: "/(practitioner)/sessions",
        expect: "/practitioners/me/sessions",
      },
      {
        name: "practitioner-session-detail",
        route: `/(practitioner)/sessions/${practitionerTarget.sessionId}`,
        expect: `/practitioners/me/sessions/${practitionerTarget.sessionId}`,
      },
      {
        name: "practitioner-availability",
        route: "/(practitioner)/availability",
        expect: [
          "/practitioners/me/availability",
          "/practitioners/me/presence",
        ],
      },
    ];

    const patientSweep = await runSweep(
      "patient",
      patientSession,
      patientPages,
    );
    const practitionerSweep = await runSweep(
      "practitioner",
      practitionerTarget.session,
      practitionerPages,
    );

    const summary = {
      checkedAt: new Date().toISOString(),
      patientTargets,
      practitionerTarget: {
        email: practitionerTarget.session.user.primaryEmail,
        sessionId: practitionerTarget.sessionId,
      },
      patientSweep,
      practitionerSweep,
      protected401Count:
        patientSweep.protected401s.length +
        practitionerSweep.protected401s.length,
      verified:
        patientSweep.protected401s.length === 0 &&
        practitionerSweep.protected401s.length === 0 &&
        patientSweep.pageIssues.length === 0 &&
        practitionerSweep.pageIssues.length === 0 &&
        patientSweep.pages.every(
          (page) => page.timedOutExpected.length === 0,
        ) &&
        practitionerSweep.pages.every(
          (page) => page.timedOutExpected.length === 0,
        ),
    };

    const outFile = path.join(OUT_DIR, "auth-bootstrap-race-summary.json");
    await fs.writeFile(outFile, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
