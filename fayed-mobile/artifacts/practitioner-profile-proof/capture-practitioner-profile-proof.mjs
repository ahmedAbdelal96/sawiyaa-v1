import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const WEB_URL = "http://localhost:19007";
const API_URL = "http://localhost:7000/api/v1";
const AUTH_SESSION_KEY = "fayed.mobile.auth.session.v1";
const DEVICE_ID_KEY = "fayed.mobile.device.id.v1";
const OUT_DIR = path.resolve(
  "D:/Web/full-projects/fayed/fayed-mobile/artifacts/practitioner-profile-proof",
);

const backendRequire = createRequire(
  "D:/Web/full-projects/fayed/fayed-backend-v1/package.json",
);
const { PrismaClient } = backendRequire("@prisma/client");

const practitionerCandidates = [
  {
    email: "dr.mohamed@hesba.local",
    password: "Practitioner2@12345",
    deviceId: "practitioner-profile-proof-b",
  },
  {
    email: "dr.ahmed@hesba.local",
    password: "Practitioner@12345",
    deviceId: "practitioner-profile-proof-a",
  },
  {
    email: "dr.mahmoud@hesba.local",
    password: "Practitioner3@12345",
    deviceId: "practitioner-profile-proof-c",
  },
  {
    email: "practitioner.bulk.40@hesba.local",
    password: "Seed@123456",
    deviceId: "practitioner-profile-proof-bulk-40",
  },
  {
    email: "practitioner.bulk.22@hesba.local",
    password: "Seed@123456",
    deviceId: "practitioner-profile-proof-bulk-22",
  },
  {
    email: "practitioner.bulk.18@hesba.local",
    password: "Seed@123456",
    deviceId: "practitioner-profile-proof-bulk-18",
  },
  {
    email: "practitioner.bulk.5@hesba.local",
    password: "Seed@123456",
    deviceId: "practitioner-profile-proof-bulk-5",
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
      "x-lang": "en",
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
    throw new Error(`Unable to extract OTP code from notification body: ${bodySnapshot}`);
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

  throw new Error(`Timed out waiting for practitioner OTP notification for ${practitionerEmail}`);
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
    deviceId: creds.deviceId,
  };
}

async function getPractitionerProfile(accessToken) {
  return api("/practitioners/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getPractitionerReadiness(accessToken) {
  return api("/practitioners/me/readiness", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getPractitionerApplication(accessToken) {
  return api("/practitioners/me/application", {
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
  return url.startsWith(API_URL) && (url.includes("/auth/me") || url.includes("/practitioners/"));
}

async function capture(page, route, filename) {
  await page.goto(`${WEB_URL}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const screenshotPath = path.join(OUT_DIR, filename);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });
}

function mapProfileToUpdatePayload(profile) {
  return {
    displayName: profile.displayName ?? undefined,
    professionalTitle: profile.professionalTitle ?? undefined,
    bio: profile.bio ?? undefined,
    countryCode: profile.countryCode ?? undefined,
    yearsOfExperience: profile.yearsOfExperience,
    practitionerType: profile.practitionerType ?? undefined,
    practitionerGender: profile.practitionerGender ?? undefined,
    locale: profile.locale ?? undefined,
    timezone: profile.timezone ?? undefined,
    languageCodes: Array.isArray(profile.languages) ? profile.languages : undefined,
    payoutDestination: profile.payoutDestination
      ? {
          methodType: profile.payoutDestination.methodType,
          accountHolderName: profile.payoutDestination.accountHolderName ?? undefined,
          bankName: profile.payoutDestination.bankName ?? undefined,
          bankAccountNumber: profile.payoutDestination.bankAccountNumber ?? undefined,
          iban: profile.payoutDestination.iban ?? undefined,
          walletProvider: profile.payoutDestination.walletProvider ?? undefined,
          walletIdentifier: profile.payoutDestination.walletIdentifier ?? undefined,
          otherDetails: profile.payoutDestination.otherDetails ?? undefined,
        }
      : null,
  };
}

async function main() {
  await ensureDir(OUT_DIR);

  const prisma = new PrismaClient();
  try {
    let session = null;
    let selectedProfile = null;
    let readiness = null;
    let application = null;

    for (const creds of practitionerCandidates) {
      try {
        const candidateSession = await loginPractitioner(prisma, creds);
        const profileResponse = await getPractitionerProfile(candidateSession.tokens.accessToken);
        const candidateProfile = profileResponse.profile;

        session = candidateSession;
        selectedProfile = candidateProfile;
        readiness = await getPractitionerReadiness(candidateSession.tokens.accessToken);
        application = await getPractitionerApplication(candidateSession.tokens.accessToken);
        break;
      } catch {
        // Try next seeded practitioner.
      }
    }

    if (!session || !selectedProfile || !readiness || !application) {
      throw new Error("Unable to authenticate a practitioner with a usable account profile.");
    }

    const originalDisplayName = selectedProfile.displayName ?? session.user.displayName ?? "Practitioner";
    const mutatedDisplayName = `${originalDisplayName} Mobile`;

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      locale: "ar-EG",
      viewport: { width: 430, height: 1320 },
    });
    const apiLog = [];
    const pageIssues = [];
    const dialogs = [];

    await context.addInitScript(
      ({ authSessionKey, deviceIdKey, persistedSession }) => {
        window.localStorage.setItem(authSessionKey, persistedSession);
        window.localStorage.setItem(deviceIdKey, "practitioner-profile-proof-browser-device");
        window.localStorage.setItem("fayed.app.language", "ar");
      },
      {
        authSessionKey: AUTH_SESSION_KEY,
        deviceIdKey: DEVICE_ID_KEY,
        persistedSession: buildPersistedSession(session),
      },
    );

    const page = await context.newPage();
    page.on("pageerror", (error) => {
      pageIssues.push({ type: "pageerror", message: error.message });
    });
    page.on("dialog", async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept().catch(() => {});
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

    await capture(page, "/(practitioner)/account", "01-account-overview.png");

    await page.waitForSelector("input").catch(() => {});
    const displayNameInput = page.locator("input").first();
    await displayNameInput.fill(mutatedDisplayName);

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/practitioners/me") &&
        response.request().method() === "PATCH",
      { timeout: 15000 },
    );
    const saveButton = page
      .locator("div.r-cursor-1loqt21")
      .filter({ hasText: "حفظ الملف" })
      .first();
    await saveButton.scrollIntoViewIfNeeded().catch(() => {});
    await saveButton.click({ timeout: 15000 });
    const saveResponse = await saveResponsePromise;
    await page.waitForTimeout(1500);

    await capture(page, "/(practitioner)/account", "02-account-after-save.png");

    await api("/practitioners/me", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
      body: JSON.stringify(mapProfileToUpdatePayload(selectedProfile)),
    });

    const restoredProfile = await getPractitionerProfile(session.tokens.accessToken);

    const summary = {
      checkedAt: new Date().toISOString(),
      webUrl: WEB_URL,
      practitioner: {
        email: session.user.primaryEmail,
        originalDisplayName,
        mutatedDisplayName,
        restoredDisplayName: restoredProfile.profile.displayName,
        profileStatus: restoredProfile.profile.profileStatus,
      },
      readiness: readiness.readiness ?? readiness,
      application: application.application ?? application,
      screenshots: ["01-account-overview.png", "02-account-after-save.png"],
      saveResponse: {
        status: saveResponse.status(),
      },
      dialogs,
      pageIssues,
      trackedApiCalls: apiLog,
      restored: restoredProfile.profile.displayName === selectedProfile.displayName,
      verified: pageIssues.length === 0,
    };

    await fs.writeFile(
      path.join(OUT_DIR, "practitioner-profile-summary.json"),
      JSON.stringify(summary, null, 2),
      "utf8",
    );

    console.log(JSON.stringify(summary, null, 2));

    await browser.close();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
