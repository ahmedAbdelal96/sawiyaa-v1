import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const WEB_URL = "http://localhost:19007";
const API_URL = "http://localhost:7000/api/v1";
const AUTH_SESSION_KEY = "fayed.mobile.auth.session.v1";
const DEVICE_ID_KEY = "fayed.mobile.device.id.v1";
const OUT_DIR = path.resolve(
  "D:/Web/full-projects/fayed/fayed-mobile/artifacts/practitioner-foundation-proof",
);
const backendRequire = createRequire(
  "D:/Web/full-projects/fayed/fayed-backend-v1/package.json",
);
const { PrismaClient } = backendRequire("@prisma/client");

const practitionerCandidates = [
  {
    email: "dr.ahmed@hesba.local",
    password: "Practitioner@12345",
    deviceId: "practitioner-foundation-proof-a",
  },
  {
    email: "dr.mohamed@hesba.local",
    password: "Practitioner2@12345",
    deviceId: "practitioner-foundation-proof-b",
  },
  {
    email: "dr.mahmoud@hesba.local",
    password: "Practitioner3@12345",
    deviceId: "practitioner-foundation-proof-c",
  },
];

const PRESENCE_LABELS = {
  ONLINE: "متصل",
  AWAY: "بعيد مؤقتاً",
  BUSY: "مشغول",
  OFFLINE: "غير متصل",
};

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

async function getPractitionerProfile(accessToken) {
  return api("/practitioners/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getMyPresence(accessToken) {
  return api("/practitioners/me/presence", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getMyAvailability(accessToken) {
  return api("/practitioners/me/availability", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getPractitionerSessions(accessToken, query = "limit=20") {
  return api(`/practitioners/me/sessions?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getPractitionerSession(accessToken, sessionId) {
  return api(`/practitioners/me/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function buildPersistedSession(session) {
  return JSON.stringify({
    role: session.role,
    user: session.user,
    tokens: session.tokens,
  });
}

function isTrackedApiUrl(url) {
  return (
    url.startsWith(API_URL) &&
    (url.includes("/auth/me") || url.includes("/practitioners/"))
  );
}

function summarizeListItems(items, limit = 3) {
  return items.slice(0, limit).map((item) => ({
    id: item.id,
    sessionCode: item.sessionCode,
    status: item.status,
    sessionMode: item.sessionMode,
    scheduledStartAt: item.scheduledStartAt,
    patientName: item.patient?.displayName ?? null,
  }));
}

function isExpectedConsoleError(message) {
  return (
    message.includes("status of 409") ||
    message.includes("status code 409") ||
    message.includes("409 (Conflict)")
  );
}

function scoreSessionItem(item) {
  let value = 0;
  if (item.sessionMode === "VIDEO") value += 100;
  if (item.status === "READY_TO_JOIN") value += 50;
  if (item.status === "IN_PROGRESS") value += 45;
  if (item.status === "UPCOMING") value += 30;
  if (item.status === "CONFIRMED") value += 20;
  if (item.status === "PENDING_PRACTITIONER_RESPONSE") value += 10;
  if (item.status === "COMPLETED") value -= 40;
  if (item.status === "CANCELLED" || item.status === "NO_SHOW") value -= 50;
  if (item.status === "EXPIRED") value -= 60;
  return value;
}

function chooseSessionItem(items) {
  const ranked = [...items].sort(
    (left, right) => scoreSessionItem(right) - scoreSessionItem(left),
  );

  return ranked[0] ?? null;
}

async function navigateAndCapture(page, route, filename, expectations, apiLog) {
  const expected = expectations.filter(Boolean);
  const waits = expected.map((fragment) =>
    page.waitForResponse((response) => response.url().includes(fragment), {
      timeout: 15000,
    }),
  );

  await page.goto(`${WEB_URL}${route}`, { waitUntil: "domcontentloaded" });
  await Promise.all(waits);
  await page
    .waitForLoadState("networkidle", { timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(1200);

  const screenshotPath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  return {
    route,
    screenshot: filename,
    responses: apiLog
      .filter((entry) =>
        expected.some((fragment) => entry.url.includes(fragment)),
      )
      .map((entry) => ({
        url: entry.url,
        status: entry.status,
        method: entry.method,
      })),
  };
}

async function clickAndCaptureResponse(page, label, responseMatcher) {
  const responsePromise = page.waitForResponse(responseMatcher, {
    timeout: 15000,
  });
  await page.getByText(label, { exact: true }).click();
  const response = await responsePromise;
  const body = await response.json().catch(() => null);
  await page.waitForTimeout(800);
  return {
    status: response.status(),
    body,
  };
}

async function hasButton(page, label) {
  return page
    .getByText(label, { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
}

async function main() {
  await ensureDir(OUT_DIR);

  const prisma = new PrismaClient();
  try {
    let practitionerSession = null;
    let selectedSession = null;
    let profile = null;
    let presence = null;
    let availability = null;
    let sessions = null;

    let bestCandidate = null;

    for (const creds of practitionerCandidates) {
      const candidateSession = await loginPractitioner(prisma, creds);
      const accessToken = candidateSession.tokens.accessToken;
      const candidateSessions = await getPractitionerSessions(accessToken);
      const item = chooseSessionItem(candidateSessions.items ?? []);
      if (!item) {
        continue;
      }

      const score = scoreSessionItem(item);
      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = {
          practitionerSession: candidateSession,
          selectedSession: item,
          sessions: candidateSessions,
          profile: await getPractitionerProfile(accessToken),
          presence: await getMyPresence(accessToken),
          availability: await getMyAvailability(accessToken),
          score,
        };
      }
    }

    if (bestCandidate) {
      practitionerSession = bestCandidate.practitionerSession;
      selectedSession = bestCandidate.selectedSession;
      sessions = bestCandidate.sessions;
      profile = bestCandidate.profile;
      presence = bestCandidate.presence;
      availability = bestCandidate.availability;
    }

    if (
      !practitionerSession ||
      !selectedSession ||
      !profile ||
      !presence ||
      !availability ||
      !sessions
    ) {
      throw new Error(
        "No seeded practitioner with usable session data was found for practitioner proof capture.",
      );
    }

    const selectedDetail = await getPractitionerSession(
      practitionerSession.tokens.accessToken,
      selectedSession.id,
    );

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      locale: "ar-EG",
      viewport: { width: 430, height: 932 },
    });
    const apiLog = [];
    const pageIssues = [];

    await context.addInitScript(
      ({ authSessionKey, deviceIdKey, persistedSession }) => {
        window.localStorage.setItem(authSessionKey, persistedSession);
        window.localStorage.setItem(
          deviceIdKey,
          "practitioner-proof-browser-device",
        );
        window.__openedUrls = [];
        const originalOpen = window.open;
        window.open = function patchedOpen(url, ...args) {
          window.__openedUrls.push(String(url));
          return originalOpen ? originalOpen.call(window, url, ...args) : null;
        };
      },
      {
        authSessionKey: AUTH_SESSION_KEY,
        deviceIdKey: DEVICE_ID_KEY,
        persistedSession: buildPersistedSession(practitionerSession),
      },
    );

    const page = await context.newPage();
    page.on("pageerror", (error) => {
      pageIssues.push({ type: "pageerror", message: error.message });
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        const text = message.text();
        if (!isExpectedConsoleError(text)) {
          pageIssues.push({ type: "console", message: text });
        }
      }
    });
    page.on("response", (response) => {
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

    const screens = {};
    const homeVisibleSessions = (sessions.items ?? []).filter((item) =>
      ["CONFIRMED", "UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(
        item.status,
      ),
    );

    screens.home = await navigateAndCapture(
      page,
      "/",
      "01-practitioner-home.png",
      [
        "/auth/me",
        "/practitioners/me",
        "/practitioners/me/presence",
        "/practitioners/me/sessions?limit=3",
      ],
      apiLog,
    );

    screens.sessionsList = await navigateAndCapture(
      page,
      "/(practitioner)/sessions",
      "02-practitioner-sessions-list.png",
      ["/practitioners/me/sessions?limit=20"],
      apiLog,
    );

    const filterResult = await clickAndCaptureResponse(
      page,
      "القادمة",
      (response) =>
        response.url().includes("/practitioners/me/sessions") &&
        response.url().includes("status=UPCOMING"),
    );

    screens.sessionDetail = await navigateAndCapture(
      page,
      `/(practitioner)/sessions/${selectedSession.id}`,
      "03-practitioner-session-detail.png",
      [`/practitioners/me/sessions/${selectedSession.id}`],
      apiLog,
    );

    let prepareAction = {
      status: "skipped",
      reason: "selected session is not a video session",
    };
    let joinAction = {
      status: "skipped",
      reason: "selected session is not a video session",
    };

    if (selectedDetail.item.sessionMode === "VIDEO") {
      if (await hasButton(page, "تجهيز غرفة الجلسة")) {
        const prepareResult = await clickAndCaptureResponse(
          page,
          "تجهيز غرفة الجلسة",
          (response) =>
            response
              .url()
              .includes(
                `/practitioners/me/sessions/${selectedSession.id}/runtime/prepare`,
              ) && response.request().method() === "POST",
        );
        prepareAction = {
          status:
            prepareResult.status === 201
              ? "success"
              : prepareResult.status === 409
                ? "blocked"
                : "unexpected-status",
          responseStatus: prepareResult.status,
          isPrepared:
            prepareResult.body?.data?.item?.isPrepared ??
            prepareResult.body?.item?.isPrepared ??
            null,
          provider:
            prepareResult.body?.data?.item?.provider ??
            prepareResult.body?.item?.provider ??
            null,
        };
      } else {
        prepareAction = {
          status: "not-available",
          reason:
            "prepare action is not shown for the current real session state",
        };
      }

      if (await hasButton(page, "التحقق من إمكانية الدخول")) {
        const joinResult = await clickAndCaptureResponse(
          page,
          "التحقق من إمكانية الدخول",
          (response) =>
            response
              .url()
              .includes(
                `/practitioners/me/sessions/${selectedSession.id}/runtime/join`,
              ) && response.request().method() === "GET",
        );
        const joinItem =
          joinResult.body?.data?.item ?? joinResult.body?.item ?? null;
        const openedUrls = await page.evaluate(() => window.__openedUrls || []);
        joinAction = {
          status: joinResult.status === 200 ? "success" : "unexpected-status",
          responseStatus: joinResult.status,
          canJoin: joinItem?.canJoin ?? null,
          blockedReason: joinItem?.blockedReason ?? null,
          provider: joinItem?.provider ?? null,
          roomUrl: joinItem?.roomUrl ?? null,
          openedUrls,
        };
      } else if (await hasButton(page, "فتح غرفة الجلسة")) {
        const openedUrls = await page.evaluate(() => window.__openedUrls || []);
        joinAction = {
          status: "ready-in-ui",
          reason:
            "session room is already presented as directly openable in the UI",
          openedUrls,
        };
      } else {
        joinAction = {
          status: "not-available",
          reason: "join action is not shown for the current real session state",
        };
      }
    }

    screens.availability = await navigateAndCapture(
      page,
      "/(practitioner)/availability",
      "04-practitioner-availability.png",
      ["/practitioners/me/presence", "/practitioners/me/availability"],
      apiLog,
    );

    const originalStatus = presence.presence.status;
    const nextStatus = ["ONLINE", "AWAY", "BUSY", "OFFLINE"].find(
      (status) => status !== originalStatus,
    );

    let presenceAction = {
      status: "skipped",
      reason: "no alternate presence status found",
    };

    if (nextStatus) {
      const updateResult = await clickAndCaptureResponse(
        page,
        PRESENCE_LABELS[nextStatus],
        (response) =>
          response.url().includes("/practitioners/me/presence/status") &&
          response.request().method() === "PUT",
      );

      const restoreResult = await clickAndCaptureResponse(
        page,
        PRESENCE_LABELS[originalStatus],
        (response) =>
          response.url().includes("/practitioners/me/presence/status") &&
          response.request().method() === "PUT",
      );

      presenceAction = {
        status:
          updateResult.status === 200 && restoreResult.status === 200
            ? "success"
            : "unexpected-status",
        changedTo: nextStatus,
        changedStatusCode: updateResult.status,
        restoredTo: originalStatus,
        restoredStatusCode: restoreResult.status,
      };
    }

    await context.close();
    await browser.close();

    const normalizedPageIssues = pageIssues.filter(
      (issue) => !String(issue.message).includes("status of 409 (Conflict)"),
    );

    const summary = {
      checkedAt: new Date().toISOString(),
      webUrl: WEB_URL,
      practitioner: {
        email: practitionerSession.user.primaryEmail,
        displayName: profile.profile.displayName,
        professionalTitle: profile.profile.professionalTitle,
        profileStatus: profile.profile.profileStatus,
      },
      screenshots: [
        screens.home.screenshot,
        screens.sessionsList.screenshot,
        screens.sessionDetail.screenshot,
        screens.availability.screenshot,
      ],
      screens: {
        home: {
          ...screens.home,
          dataAppeared: {
            displayName: profile.profile.displayName,
            professionalTitle: profile.profile.professionalTitle,
            profileStatus: profile.profile.profileStatus,
            presenceStatus: presence.presence.status,
            instantBookingEnabled: presence.presence.isInstantBookingEnabled,
            visibleNextSessions: summarizeListItems(homeVisibleSessions, 3),
            emptyNextSessionsState: homeVisibleSessions.length === 0,
          },
        },
        sessionsList: {
          ...screens.sessionsList,
          dataAppeared: {
            totalItems:
              sessions.pagination?.totalItems ?? sessions.items?.length ?? 0,
            sampleItems: summarizeListItems(sessions.items ?? [], 5),
          },
        },
        sessionDetail: {
          ...screens.sessionDetail,
          dataAppeared: {
            id: selectedDetail.item.id,
            sessionCode: selectedDetail.item.sessionCode,
            patientName: selectedDetail.item.patient?.displayName ?? null,
            status: selectedDetail.item.status,
            sessionMode: selectedDetail.item.sessionMode,
            flowType: selectedDetail.item.flowType,
            durationMinutes: selectedDetail.item.durationMinutes,
            timezone: selectedDetail.item.timezone,
            scheduledStartAt: selectedDetail.item.scheduledStartAt,
          },
        },
        availability: {
          ...screens.availability,
          dataAppeared: {
            presenceStatus: presence.presence.status,
            instantBookingEnabled: presence.presence.isInstantBookingEnabled,
            timezone: availability.timezone,
            weeklySlotCount: availability.weeklySlots.length,
            exceptionCount: availability.exceptions.length,
            weeklySlots: availability.weeklySlots.slice(0, 7),
            exceptions: availability.exceptions.slice(0, 5),
          },
        },
      },
      actions: [
        {
          name: "open-practitioner-home",
          status: "success",
          route: screens.home.route,
        },
        {
          name: "open-practitioner-sessions-list",
          status: "success",
          route: screens.sessionsList.route,
        },
        {
          name: "filter-sessions-upcoming",
          status: filterResult.status === 200 ? "success" : "unexpected-status",
          responseStatus: filterResult.status,
        },
        {
          name: "open-practitioner-session-detail",
          status: "success",
          route: screens.sessionDetail.route,
        },
        {
          name: "prepare-session-runtime",
          ...prepareAction,
        },
        {
          name: "resolve-session-join-contract",
          ...joinAction,
        },
        {
          name: "open-practitioner-availability",
          status: "success",
          route: screens.availability.route,
        },
        {
          name: "change-presence-status-and-restore",
          ...presenceAction,
        },
      ],
      pageIssues: normalizedPageIssues,
      trackedApiCalls: apiLog,
      limitations: [],
      verified: normalizedPageIssues.length === 0,
    };

    if (joinAction.status === "success" && joinAction.canJoin === false) {
      summary.limitations.push(
        `Join contract was reached successfully, but backend blocked entry with reason ${joinAction.blockedReason}.`,
      );
    }

    if (prepareAction.status === "blocked") {
      summary.limitations.push(
        `Prepare runtime reached the backend but was blocked with HTTP 409 for the selected real session state.`,
      );
    }

    if (prepareAction.status === "blocked") {
      summary.limitations.push(
        "Prepare runtime action reached the real backend but returned 409 because the selected seeded session was not in a preparable lifecycle state.",
      );
    }

    if (prepareAction.status === "skipped") {
      summary.limitations.push(
        "Selected session was not VIDEO, so prepare/join buttons were not exercised in this run.",
      );
    }

    if (homeVisibleSessions.length === 0) {
      summary.limitations.push(
        "The selected practitioner account had no active upcoming/ready/in-progress sessions, so the home screen proof shows the real empty next-sessions state rather than an active queue.",
      );
    }

    const outFile = path.join(OUT_DIR, "practitioner-foundation-summary.json");
    await fs.writeFile(outFile, JSON.stringify(summary, null, 2), "utf8");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
