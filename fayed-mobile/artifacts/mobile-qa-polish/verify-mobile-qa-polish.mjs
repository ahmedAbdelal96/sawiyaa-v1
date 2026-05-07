import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOBILE_ROOT = path.resolve(__dirname, "../..");
const WEB_URL = "http://127.0.0.1:8081";
const API_URL = "http://127.0.0.1:7000/api/v1";
const AUTH_SESSION_KEY = "fayed.mobile.auth.session.v1";
const DEVICE_ID_KEY = "fayed.mobile.device.id.v1";
const APP_LANGUAGE_KEY = "fayed.app.language";

const backendRequire = createRequire(
  pathToFileURL(
    path.resolve(MOBILE_ROOT, "../fayed-backend-v1/package.json"),
  ).href,
);
const { PrismaClient } = backendRequire("@prisma/client");

const patientCreds = {
  email: "ahmed.patient@hesba.local",
  password: "Patient@12345",
  deviceId: "qa-pollish-patient-device",
};

const practitionerCreds = {
  email: "dr.mohamed@hesba.local",
  password: "Practitioner2@12345",
  deviceId: "qa-pollish-practitioner-device",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function extractOtpCode(bodySnapshot) {
  const match = String(bodySnapshot ?? "").match(/(\d{4,8})/);
  if (!match) {
    throw new Error(`Unable to extract OTP from notification body: ${bodySnapshot}`);
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
      throw new Error(`No user found for practitioner email ${practitionerEmail}`);
    }

    const notification = await prisma.notification.findFirst({
      where: {
        userId: userEmail.userId,
        createdAt: { gte: startedAt },
        notificationType: { slug: "auth.practitioner-login-otp" },
      },
      orderBy: { createdAt: "desc" },
      select: { bodySnapshot: true },
    });

    if (notification?.bodySnapshot) {
      return extractOtpCode(notification.bodySnapshot);
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for practitioner OTP for ${practitionerEmail}`);
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

async function loginPractitioner(prisma) {
  const startedAt = new Date();
  const challenge = await api("/auth/practitioner/login", {
    method: "POST",
    body: JSON.stringify({
      email: practitionerCreds.email,
      password: practitionerCreds.password,
    }),
  });

  const code = await waitForPractitionerOtp(
    prisma,
    practitionerCreds.email,
    startedAt,
  );

  const payload = await api("/auth/practitioner/login/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      code,
      deviceId: practitionerCreds.deviceId,
    }),
  });

  return {
    role: "practitioner",
    user: payload.user,
    tokens: payload.tokens,
  };
}

function buildPersistedSession(session) {
  return JSON.stringify({
    role: session.role,
    user: session.user,
    tokens: session.tokens,
  });
}

async function seedLanguage(context) {
  await context.addInitScript(
    ({ authSessionKey, deviceIdKey, languageKey, persistedSession, deviceId }) => {
      window.localStorage.setItem(authSessionKey, persistedSession);
      window.localStorage.setItem(deviceIdKey, deviceId);
      window.localStorage.setItem(languageKey, "ar");
    },
    {
      authSessionKey: AUTH_SESSION_KEY,
      deviceIdKey: DEVICE_ID_KEY,
      languageKey: APP_LANGUAGE_KEY,
      persistedSession: "",
      deviceId: "",
    },
  );
}

async function createAuthedContext(browser, session, role) {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    locale: "ar-EG",
  });

  await context.addInitScript(
    ({ authSessionKey, deviceIdKey, languageKey, persistedSession, deviceId }) => {
      window.localStorage.setItem(authSessionKey, persistedSession);
      window.localStorage.setItem(deviceIdKey, deviceId);
      window.localStorage.setItem(languageKey, "ar");
    },
    {
      authSessionKey: AUTH_SESSION_KEY,
      deviceIdKey: DEVICE_ID_KEY,
      languageKey: APP_LANGUAGE_KEY,
      persistedSession: buildPersistedSession(session),
      deviceId: `${role}-qa-browser-device`,
    },
  );

  return context;
}

async function safeWait(page) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function main() {
  const prisma = new PrismaClient();
  const browser = await chromium.launch({ headless: true });

  const outputDir = path.join(__dirname);
  await fs.mkdir(outputDir, { recursive: true });

  const patientSession = await loginPatient();
  const practitionerSession = await loginPractitioner(prisma);

  const patientSessions = await api("/patients/me/sessions?page=1&limit=25", {
    headers: { Authorization: `Bearer ${patientSession.tokens.accessToken}` },
  });
  const practitionerSessions = await api(
    "/practitioners/me/sessions?page=1&limit=25",
    {
      headers: { Authorization: `Bearer ${practitionerSession.tokens.accessToken}` },
    },
  );

  const patientSessionItem = patientSessions.items?.[0] ?? null;
  const payablePatientSession =
    patientSessions.items?.find((item) => item.status === "PENDING_PAYMENT") ??
    null;
  const practitionerSessionItem = practitionerSessions.items?.[0] ?? null;

  const results = {
    patient: {
      sessionsCount: patientSessions.items?.length ?? 0,
      patientSessionId: patientSessionItem?.id ?? null,
      payableSessionId: payablePatientSession?.id ?? null,
    },
    practitioner: {
      sessionsCount: practitionerSessions.items?.length ?? 0,
      practitionerSessionId: practitionerSessionItem?.id ?? null,
    },
    screenshots: [],
  };

  {
    const context = await createAuthedContext(browser, patientSession, "patient");
    const page = await context.newPage();
    await page.goto(`${WEB_URL}/`, { waitUntil: "domcontentloaded" });
    await safeWait(page);
    await page.screenshot({
      path: path.join(outputDir, "01-patient-home.png"),
      fullPage: true,
    });
    results.screenshots.push("01-patient-home.png");
    await page.locator('a[href="/sessions"]').click();
    await safeWait(page);
    await page.screenshot({
      path: path.join(outputDir, "02-patient-sessions-list.png"),
      fullPage: true,
    });
    results.screenshots.push("02-patient-sessions-list.png");

    if (patientSessionItem?.id) {
      await page.getByText(patientSessionItem.sessionCode, { exact: true }).first().click();
      await safeWait(page);
      await page.screenshot({
        path: path.join(outputDir, "03-patient-session-detail.png"),
        fullPage: true,
      });
      results.screenshots.push("03-patient-session-detail.png");
    }

    if (payablePatientSession?.id) {
      await page.getByText("الدفع الآن", { exact: true }).first().click();
      await safeWait(page);
      await page.screenshot({
        path: path.join(outputDir, "04-patient-session-pay.png"),
        fullPage: true,
      });
      results.screenshots.push("04-patient-session-pay.png");
    }

    await context.close();
  }

  {
    const context = await createAuthedContext(
      browser,
      practitionerSession,
      "practitioner",
    );
    const page = await context.newPage();
    await page.goto(`${WEB_URL}/`, { waitUntil: "domcontentloaded" });
    await safeWait(page);
    await page.screenshot({
      path: path.join(outputDir, "05-practitioner-home.png"),
      fullPage: true,
    });
    results.screenshots.push("05-practitioner-home.png");
    await page.locator('a[href="/sessions"]').click();
    await safeWait(page);
    await page.screenshot({
      path: path.join(outputDir, "06-practitioner-sessions-list.png"),
      fullPage: true,
    });
    results.screenshots.push("06-practitioner-sessions-list.png");

    if (practitionerSessionItem?.id) {
      await page.getByText(practitionerSessionItem.sessionCode, { exact: true }).first().click();
      await safeWait(page);
      await page.screenshot({
        path: path.join(outputDir, "07-practitioner-session-detail.png"),
        fullPage: true,
      });
      results.screenshots.push("07-practitioner-session-detail.png");
    }

    await context.close();
  }

  await browser.close();
  await prisma.$disconnect();

  const summaryPath = path.join(outputDir, "mobile-qa-polish-summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(results, null, 2), "utf8");
  console.log(JSON.stringify({ summaryPath, results }, null, 2));
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
