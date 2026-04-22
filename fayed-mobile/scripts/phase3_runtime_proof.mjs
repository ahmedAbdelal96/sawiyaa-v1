import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const WEB_BASE = "http://localhost:19007";
const API_BASE = "http://localhost:7000/api/v1";
const DEVICE_ID = "phase3-proof-device";
const OUTPUT_DIR = path.resolve(
  "runtime-proof",
  "phase3",
  new Date().toISOString().replace(/[:.]/g, "-"),
);

const proof = {
  timestamp: new Date().toISOString(),
  webBase: WEB_BASE,
  apiBase: API_BASE,
  auth: null,
  actions: [],
  screens: [],
  blocked: [],
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function api(pathname, options = {}) {
  const url = `${API_BASE}${pathname}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `${options.method || "GET"} ${pathname} failed: ${res.status} ${JSON.stringify(json)}`,
    );
  }
  return json;
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const login = await api("/auth/patient/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "ahmed.patient@hesba.local",
      password: "Patient@12345",
      deviceId: DEVICE_ID,
    }),
  });

  const authData = login?.data;
  const accessToken = authData?.tokens?.accessToken;
  if (!accessToken) {
    throw new Error("Login succeeded without access token");
  }

  const persistedSession = {
    role: "patient",
    user: authData.user,
    tokens: authData.tokens,
  };

  proof.auth = {
    userId: authData.user?.id,
    email: authData.user?.primaryEmail,
    role: persistedSession.role,
  };

  const authHeaders = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    "x-lang": "en",
  };

  const ticketSubject = `Phase3 Proof Ticket ${Date.now()}`;
  const createTicket = await api("/patients/me/support/tickets", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      category: "TECHNICAL",
      subject: ticketSubject,
      description:
        "Created by runtime proof automation for Phase 3 verification.",
    }),
  });

  const ticketId = createTicket?.data?.item?.id;
  proof.actions.push({
    action: "create_support_ticket",
    ok: Boolean(ticketId),
    ticketId: ticketId || null,
  });

  if (ticketId) {
    const sendSupportMessage = await api(
      `/patients/me/support/tickets/${ticketId}/messages`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          message: "Patient follow-up message from runtime proof.",
        }),
      },
    );

    proof.actions.push({
      action: "send_support_message",
      ok: Boolean(sendSupportMessage?.data?.item?.id),
      ticketId,
      messageId: sendSupportMessage?.data?.item?.id || null,
    });
  }

  const practitioners = await api("/public/practitioners?page=1&limit=1", {
    headers: {
      "x-lang": "en",
    },
  });

  const practitionerSlug = practitioners?.data?.items?.[0]?.slug;
  if (!practitionerSlug) {
    throw new Error("No practitioner slug found from /public/practitioners");
  }

  const createCareRequest = await api("/patients/me/care-chat/requests", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      practitionerSlug,
      reason: "Phase 3 runtime verification request",
    }),
  });

  const createdRequestId = createCareRequest?.data?.item?.id;
  const createdRequestStatus = createCareRequest?.data?.item?.status;

  proof.actions.push({
    action: "create_care_chat_request",
    ok: Boolean(createdRequestId),
    practitionerSlug,
    requestId: createdRequestId || null,
    status: createdRequestStatus || null,
  });

  const requestsList = await api(
    "/patients/me/care-chat/requests?page=1&limit=50",
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-lang": "en",
      },
    },
  );

  const allRequests = requestsList?.data?.items || [];
  const approvedRequest = allRequests.find(
    (r) => r.status === "APPROVED" && r.linkedConversationId,
  );
  const pendingOrRejected = allRequests.find((r) =>
    ["PENDING", "REJECTED", "EXPIRED", "CANCELLED", "REVOKED"].includes(
      r.status,
    ),
  );

  if (!approvedRequest) {
    proof.blocked.push({
      area: "care_chat_approved_conversation",
      reason:
        "No approved care-chat request with linked conversation exists for this patient in current backend data.",
    });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
  });

  await context.addInitScript(
    ({ session, deviceId }) => {
      window.localStorage.setItem(
        "fayed.mobile.auth.session.v1",
        JSON.stringify(session),
      );
      window.localStorage.setItem("fayed.mobile.device.id.v1", deviceId);
    },
    { session: persistedSession, deviceId: DEVICE_ID },
  );

  const page = await context.newPage();

  async function shot(name, route) {
    const url = `${WEB_BASE}${route}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const fileName = `${name}.png`;
    const fullPath = path.join(OUTPUT_DIR, fileName);
    await page.screenshot({ path: fullPath, fullPage: true });
    proof.screens.push({ name, route, file: fullPath });
  }

  const supportDetailRoute = ticketId ? `/support/${ticketId}` : "/support";
  const requestDetailRoute =
    pendingOrRejected?.id || createdRequestId
      ? `/care-chat/request/${pendingOrRejected?.id || createdRequestId}`
      : "/care-chat";

  await shot("01-home-journey", "/");
  await shot("02-support-list", "/support");
  await shot("03-support-new", "/support/new");
  await shot("04-support-detail-thread", supportDetailRoute);
  await shot("05-care-chat-list", "/care-chat");
  await shot("06-care-chat-new-request", "/care-chat/new");
  await shot("07-care-chat-request-detail", requestDetailRoute);

  if (approvedRequest?.linkedConversationId) {
    await shot(
      "08-care-chat-approved-conversation",
      `/care-chat/${approvedRequest.linkedConversationId}`,
    );

    try {
      await page
        .locator("input")
        .last()
        .fill("Automated runtime proof message");
      await page
        .getByRole("button")
        .filter({ hasText: /send|ارسال|إرسال|submit/i })
        .first()
        .click({ timeout: 2000 });
      proof.actions.push({
        action: "send_care_chat_message",
        ok: true,
        conversationId: approvedRequest.linkedConversationId,
      });
    } catch {
      proof.actions.push({
        action: "send_care_chat_message",
        ok: false,
        conversationId: approvedRequest.linkedConversationId,
        note: "UI send button not reliably detectable in automated run.",
      });
    }
  } else {
    await shot("08-care-chat-approved-conversation-blocked", "/care-chat");
    proof.actions.push({
      action: "send_care_chat_message",
      ok: false,
      blocked: true,
      note: "No approved linked conversation available for patient; cannot send conversation message honestly.",
    });
  }

  await browser.close();

  const proofPath = path.join(OUTPUT_DIR, "runtime-proof.json");
  await fs.writeFile(proofPath, JSON.stringify(proof, null, 2), "utf8");

  console.log(JSON.stringify({ outputDir: OUTPUT_DIR, proofPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
