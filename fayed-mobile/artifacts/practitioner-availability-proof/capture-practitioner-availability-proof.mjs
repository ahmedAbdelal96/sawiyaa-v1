import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const WEB_URL = "http://localhost:19007";
const API_URL = "http://localhost:7000/api/v1";
const AUTH_SESSION_KEY = "fayed.mobile.auth.session.v1";
const DEVICE_ID_KEY = "fayed.mobile.device.id.v1";
const OUT_DIR = path.resolve(
  "D:/Web/full-projects/fayed/fayed-mobile/artifacts/practitioner-availability-proof",
);
const backendRequire = createRequire(
  "D:/Web/full-projects/fayed/fayed-backend-v1/package.json",
);
const { PrismaClient } = backendRequire("@prisma/client");

const practitionerCandidates = [
  {
    email: "dr.ahmed@hesba.local",
    password: "Practitioner@12345",
    deviceId: "practitioner-availability-proof-a",
  },
  {
    email: "dr.mohamed@hesba.local",
    password: "Practitioner2@12345",
    deviceId: "practitioner-availability-proof-b",
  },
  {
    email: "dr.mahmoud@hesba.local",
    password: "Practitioner3@12345",
    deviceId: "practitioner-availability-proof-c",
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

async function getMyAvailability(accessToken) {
  return api("/practitioners/me/availability", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function replaceWeeklyAvailability(accessToken, payload) {
  return api("/practitioners/me/availability/weekly-slots", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

async function createAvailabilityException(accessToken, payload) {
  return api("/practitioners/me/availability/exceptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

async function deleteAvailabilityException(accessToken, exceptionId) {
  return api(`/practitioners/me/availability/exceptions/${exceptionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getMyPresence(accessToken) {
  return api("/practitioners/me/presence", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function setPresenceStatus(accessToken, status) {
  return api("/practitioners/me/presence/status", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ status }),
  });
}

async function setInstantBooking(accessToken, isInstantBookingEnabled) {
  return api("/practitioners/me/presence/instant-booking", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ isInstantBookingEnabled }),
  });
}

function buildPersistedSession(session) {
  return JSON.stringify({
    role: session.role,
    user: session.user,
    tokens: session.tokens,
  });
}

function serializeSlot(slot) {
  return `${slot.dayOfWeek}:${slot.startMinuteOfDay}:${slot.endMinuteOfDay}`;
}

function chooseExtraSlot(weeklySlots) {
  const active = weeklySlots.filter((slot) => slot.isActive);
  for (let day = 0; day <= 6; day += 1) {
    const daySlots = active
      .filter((slot) => slot.dayOfWeek === day)
      .sort((left, right) => left.startMinuteOfDay - right.startMinuteOfDay);

    if (daySlots.length === 0) {
      return {
        dayOfWeek: day,
        startMinuteOfDay: 600,
        endMinuteOfDay: 720,
      };
    }

    let cursor = 480;
    for (const slot of daySlots) {
      if (slot.startMinuteOfDay - cursor >= 60) {
        return {
          dayOfWeek: day,
          startMinuteOfDay: cursor,
          endMinuteOfDay: cursor + 60,
        };
      }
      cursor = Math.max(cursor, slot.endMinuteOfDay);
    }

    if (1440 - cursor >= 60) {
      return {
        dayOfWeek: day,
        startMinuteOfDay: cursor,
        endMinuteOfDay: cursor + 60,
      };
    }
  }

  return null;
}

async function capture(page, route, filename, expectations, apiLog) {
  const waits = expectations.map((fragment) =>
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
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });

  return {
    route,
    screenshot: filename,
    responses: apiLog.filter((entry) =>
      expectations.some((fragment) => entry.url.includes(fragment)),
    ),
  };
}

async function choosePractitioner(prisma) {
  for (const creds of practitionerCandidates) {
    const session = await loginPractitioner(prisma, creds);
    const availability = await getMyAvailability(session.tokens.accessToken);
    if (availability?.timezone) {
      return {
        session,
        availability,
      };
    }
  }

  throw new Error("No practitioner with readable availability data was found.");
}

async function main() {
  await ensureDir(OUT_DIR);

  const prisma = new PrismaClient();
  try {
    const { session, availability } = await choosePractitioner(prisma);
    const accessToken = session.tokens.accessToken;
    const originalPresence = await getMyPresence(accessToken);
    const originalSlots = availability.weeklySlots
      .filter((slot) => slot.isActive)
      .map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startMinuteOfDay: slot.startMinuteOfDay,
        endMinuteOfDay: slot.endMinuteOfDay,
      }));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      locale: "ar-EG",
      viewport: { width: 430, height: 1100 },
    });
    const apiLog = [];

    await context.addInitScript(
      ({ authSessionKey, deviceIdKey, persistedSession }) => {
        window.localStorage.setItem(authSessionKey, persistedSession);
        window.localStorage.setItem(
          deviceIdKey,
          "practitioner-availability-proof-browser",
        );
      },
      {
        authSessionKey: AUTH_SESSION_KEY,
        deviceIdKey: DEVICE_ID_KEY,
        persistedSession: buildPersistedSession(session),
      },
    );

    const page = await context.newPage();
    page.on("response", (response) => {
      const url = response.url();
      if (
        url.startsWith(API_URL) &&
        (url.includes("/auth/me") ||
          url.includes("/practitioners/me/availability") ||
          url.includes("/practitioners/me/presence"))
      ) {
        apiLog.push({
          url,
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    const summary = {
      checkedAt: new Date().toISOString(),
      practitioner: {
        email: session.user.primaryEmail,
      },
      screenshots: [],
      actions: [],
      screens: {},
      pageIssues: [],
      limitations: [],
      verified: false,
    };

    summary.screens.initial = await capture(
      page,
      "/(practitioner)/availability",
      "01-availability-overview.png",
      [
        "/auth/me",
        "/practitioners/me/presence",
        "/practitioners/me/availability",
      ],
      apiLog,
    );
    summary.screenshots.push("01-availability-overview.png");

    const nextPresenceStatus = ["ONLINE", "AWAY", "BUSY", "OFFLINE"].find(
      (status) => status !== originalPresence.presence.status,
    );

    if (nextPresenceStatus) {
      await setPresenceStatus(accessToken, nextPresenceStatus);
      await setPresenceStatus(accessToken, originalPresence.presence.status);
      summary.actions.push({
        name: "change-presence-status-and-restore",
        status: "success",
        changedTo: nextPresenceStatus,
        restoredTo: originalPresence.presence.status,
      });
    }

    await setInstantBooking(
      accessToken,
      !originalPresence.presence.isInstantBookingEnabled,
    );
    await setInstantBooking(
      accessToken,
      originalPresence.presence.isInstantBookingEnabled,
    );
    summary.actions.push({
      name: "toggle-instant-booking-and-restore",
      status: "success",
      restoredTo: originalPresence.presence.isInstantBookingEnabled,
    });

    const extraSlot = chooseExtraSlot(availability.weeklySlots);
    let createdExceptionId = null;

    if (extraSlot) {
      const slotPayload = {
        timezone: availability.timezone,
        slots: [...originalSlots, extraSlot],
      };
      const updatedAvailability = await replaceWeeklyAvailability(
        accessToken,
        slotPayload,
      );
      summary.actions.push({
        name: "replace-weekly-slots",
        status: "success",
        addedSlot: extraSlot,
        resultingSlotCount: updatedAvailability.weeklySlots.filter(
          (slot) => slot.isActive,
        ).length,
      });

      summary.screens.withAddedSlot = await capture(
        page,
        "/(practitioner)/availability",
        "02-availability-with-added-slot.png",
        ["/practitioners/me/availability", "/practitioners/me/presence"],
        apiLog,
      );
      summary.screenshots.push("02-availability-with-added-slot.png");

      const now = new Date();
      now.setUTCDate(now.getUTCDate() + 3);
      now.setUTCHours(12, 0, 0, 0);
      const endsAt = new Date(now);
      endsAt.setUTCHours(14, 0, 0, 0);

      const exceptionResult = await createAvailabilityException(accessToken, {
        type: "BLOCK",
        startsAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: "Temporary proof block",
      });
      const createdException = exceptionResult.exceptions.find(
        (item) => item.reason === "Temporary proof block" && item.isActive,
      );
      createdExceptionId = createdException?.id ?? null;

      summary.actions.push({
        name: "create-availability-exception",
        status: createdExceptionId ? "success" : "not-found-after-create",
        type: "BLOCK",
      });

      summary.screens.withException = await capture(
        page,
        "/(practitioner)/availability",
        "03-availability-with-exception.png",
        ["/practitioners/me/availability", "/practitioners/me/presence"],
        apiLog,
      );
      summary.screenshots.push("03-availability-with-exception.png");
    } else {
      summary.actions.push({
        name: "replace-weekly-slots",
        status: "skipped",
        reason: "no free one-hour gap was found in the seeded weekly schedule",
      });
      summary.limitations.push(
        "No free one-hour weekly gap was available, so the slot-add proof step was skipped.",
      );
    }

    if (createdExceptionId) {
      await deleteAvailabilityException(accessToken, createdExceptionId);
      summary.actions.push({
        name: "delete-availability-exception",
        status: "success",
      });
    }

    await replaceWeeklyAvailability(accessToken, {
      timezone: availability.timezone,
      slots: originalSlots,
    });
    summary.actions.push({
      name: "restore-original-weekly-slots",
      status: "success",
    });

    summary.runtimeData = {
      timezone: availability.timezone,
      originalSlotCount: originalSlots.length,
      originalExceptionCount: availability.exceptions.filter(
        (item) => item.isActive,
      ).length,
    };
    summary.trackedApiCalls = apiLog;
    summary.verified = true;

    await fs.writeFile(
      path.join(OUT_DIR, "practitioner-availability-summary.json"),
      JSON.stringify(summary, null, 2),
      "utf8",
    );

    await context.close();
    await browser.close();

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
