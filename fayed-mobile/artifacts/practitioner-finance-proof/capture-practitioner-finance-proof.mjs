import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const WEB_URL = "http://localhost:19007";
const API_URL = "http://localhost:7000/api/v1";
const OUT_DIR = path.resolve(
  "D:/Web/full-projects/fayed/fayed-mobile/artifacts/practitioner-finance-proof",
);
const backendRequire = createRequire(
  "D:/Web/full-projects/fayed/fayed-backend-v1/package.json",
);
const { PrismaClient } = backendRequire("@prisma/client");

const practitionerCandidates = [
  {
    email: "practitioner.bulk.40@hesba.local",
    password: "Seed@123456",
    deviceId: "practitioner-finance-proof-bulk-40",
  },
  {
    email: "practitioner.bulk.22@hesba.local",
    password: "Seed@123456",
    deviceId: "practitioner-finance-proof-bulk-22",
  },
  {
    email: "practitioner.bulk.18@hesba.local",
    password: "Seed@123456",
    deviceId: "practitioner-finance-proof-bulk-18",
  },
  {
    email: "practitioner.bulk.5@hesba.local",
    password: "Seed@123456",
    deviceId: "practitioner-finance-proof-bulk-5",
  },
  {
    email: "dr.ahmed@hesba.local",
    password: "Practitioner@12345",
    deviceId: "practitioner-finance-proof-a",
  },
  {
    email: "dr.mohamed@hesba.local",
    password: "Practitioner2@12345",
    deviceId: "practitioner-finance-proof-b",
  },
  {
    email: "dr.mahmoud@hesba.local",
    password: "Practitioner3@12345",
    deviceId: "practitioner-finance-proof-c",
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

async function waitForPractitionerOtp(prisma, practitionerEmail) {
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
      const match = String(notification.bodySnapshot).match(/(\d{4,8})/);
      if (match) {
        return match[1];
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for practitioner OTP notification for ${practitionerEmail}`);
}

async function loginPractitioner(prisma, creds) {
  const challenge = await api("/auth/practitioner/login", {
    method: "POST",
    body: JSON.stringify({
      email: creds.email,
      password: creds.password,
    }),
  });

  const code = await waitForPractitionerOtp(prisma, creds.email);
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

async function pickPractitionerSession(prisma) {
  for (const creds of practitionerCandidates) {
    try {
      return await loginPractitioner(prisma, creds);
    } catch {
      // Try next candidate.
    }
  }

  throw new Error("Unable to authenticate any practitioner candidate for finance proof.");
}

async function capture(page, route, filename, waitMs = 1800) {
  await page.goto(`${WEB_URL}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(waitMs);
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage: true,
  });
}

async function main() {
  await ensureDir(OUT_DIR);

  const prisma = new PrismaClient();
  const session = await pickPractitionerSession(prisma);
  await prisma.$disconnect();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });

  await context.addInitScript(
    ({ session: nextSession, deviceId }) => {
      localStorage.setItem(
        "fayed.mobile.auth.session.v1",
        JSON.stringify(nextSession),
      );
      localStorage.setItem("fayed.mobile.device.id.v1", deviceId);
      localStorage.setItem("fayed.app.language", "ar");
    },
    {
      session,
      deviceId: session.deviceId,
    },
  );

  const page = await context.newPage();
  const runtime = {
    web: WEB_URL,
    practitioner: session.user.primaryEmail,
    screenshots: [],
    wallet: null,
    ledgerCount: null,
    settlementsCount: null,
  };

  await capture(page, "/(practitioner)/finance", "01-finance-overview.png");
  runtime.screenshots.push("01-finance-overview.png");

  await capture(page, "/(practitioner)/finance/wallet", "02-finance-wallet.png");
  runtime.screenshots.push("02-finance-wallet.png");

  await capture(page, "/(practitioner)/finance/ledger", "03-finance-ledger.png");
  runtime.screenshots.push("03-finance-ledger.png");

  await capture(
    page,
    "/(practitioner)/finance/settlements",
    "04-finance-settlements.png",
  );
  runtime.screenshots.push("04-finance-settlements.png");

  runtime.wallet = await api("/practitioners/me/wallet", {
    headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
  });
  const ledger = await api("/practitioners/me/ledger?page=1&limit=3", {
    headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
  });
  const settlements = await api("/practitioners/me/settlements?page=1&limit=3", {
    headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
  });

  runtime.ledgerCount = ledger.items?.length ?? 0;
  runtime.settlementsCount = settlements.items?.length ?? 0;

  await fs.writeFile(
    path.join(OUT_DIR, "practitioner-finance-summary.json"),
    JSON.stringify(runtime, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(runtime, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
