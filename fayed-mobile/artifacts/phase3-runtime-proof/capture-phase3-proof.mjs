import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const WEB_URL = "http://localhost:19007";
const API_URL = "http://localhost:7000/api/v1";
const OUT_DIR = path.resolve(
  "D:/Web/full-projects/fayed/fayed-mobile/artifacts/phase3-runtime-proof",
);

const patientCreds = {
  email: "ahmed.patient@hesba.local",
  password: "Patient@12345",
  deviceId: "phase3-proof-patient-device",
};

const patient2Creds = {
  email: "mohamed.patient@hesba.local",
  password: "Patient2@12345",
  deviceId: "phase3-proof-patient2-device",
};

const adminCreds = {
  email: "admin@hesba.local",
  password: "Admin@12345",
  deviceId: "phase3-proof-admin-device",
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

  return body;
}

async function loginPatient(creds) {
  const result = await api("/auth/patient/login", {
    method: "POST",
    body: JSON.stringify(creds),
  });
  const payload = result.data;

  return {
    tokens: payload.tokens,
    user: payload.user,
    role: "patient",
  };
}

async function loginAdmin() {
  const result = await api("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify(adminCreds),
  });

  return result.data.tokens.accessToken;
}

async function getPractitioners(patientAccessToken) {
  const publicList = await api("/public/practitioners?limit=10", {
    headers: { Authorization: `Bearer ${patientAccessToken}` },
  });

  const items = publicList?.data?.items ?? publicList?.items ?? [];
  if (!items.length) {
    throw new Error(
      "No practitioners available from public practitioners list.",
    );
  }

  return items;
}

async function listSupport(accessToken) {
  return api("/patients/me/support/tickets", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function createSupportTicket(accessToken, payload) {
  return api("/patients/me/support/tickets", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

async function addPatientSupportMessage(accessToken, ticketId, message) {
  return api(`/patients/me/support/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ message }),
  });
}

async function addAdminSupportMessage(adminAccessToken, ticketId, message) {
  return api(`/admin/support/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminAccessToken}` },
    body: JSON.stringify({ message }),
  });
}

async function closeSupportTicket(adminAccessToken, ticketId) {
  return api(`/admin/support/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminAccessToken}` },
    body: JSON.stringify({ status: "CLOSED" }),
  });
}

async function listCareRequests(accessToken) {
  return api("/patients/me/care-chat/requests", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function createCareRequest(accessToken, payload) {
  return api("/patients/me/care-chat/requests", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

async function decideCareRequest(adminAccessToken, requestId, decision, note) {
  return api(`/admin/care-chat/requests/${requestId}/decision`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminAccessToken}` },
    body: JSON.stringify({ decision, note }),
  });
}

async function sendCareMessage(accessToken, conversationId, message) {
  return api(
    `/patients/me/care-chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ message }),
    },
  );
}

async function loginViaUi(page, creds) {
  await page.goto(`${WEB_URL}/signin/patient`, { waitUntil: "networkidle" });
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("name@example.com").fill(creds.email);
  await page.getByPlaceholder("أدخل كلمة المرور").fill(creds.password);
  await page.locator("text=تسجيل الدخول كمريض").last().click();
  await page.waitForTimeout(2500);
}

async function capture(page, route, filename, waitMs = 1800) {
  await page.goto(`${WEB_URL}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
}

async function main() {
  await ensureDir(OUT_DIR);

  const patientSession = await loginPatient(patientCreds);
  const secondPatientSession = await loginPatient(patient2Creds);
  const adminAccessToken = await loginAdmin();
  const practitioners = await getPractitioners(
    patientSession.tokens.accessToken,
  );

  const existingCareRequests = await listCareRequests(
    patientSession.tokens.accessToken,
  );
  const activePractitionerIds = new Set(
    (existingCareRequests.data.items || [])
      .filter((item) => item.status === "PENDING" || item.status === "APPROVED")
      .map((item) => item.practitioner.id),
  );

  const pendingExisting = (existingCareRequests.data.items || []).find(
    (item) => item.status === "PENDING",
  );

  const availablePractitioners = practitioners.filter(
    (item) => !activePractitionerIds.has(item.id),
  );

  if (availablePractitioners.length < 2) {
    throw new Error(
      `Need at least 2 practitioners without active care-chat requests, found ${availablePractitioners.length}.`,
    );
  }

  const pendingPractitioner = pendingExisting
    ? (practitioners.find(
        (item) => item.id === pendingExisting.practitioner.id,
      ) ?? practitioners[0])
    : availablePractitioners[0];
  const approvedPractitioner =
    availablePractitioners[0].id === pendingPractitioner.id
      ? availablePractitioners[1]
      : availablePractitioners[0];
  const rejectedPractitioner =
    availablePractitioners.find(
      (item) =>
        item.id !== pendingPractitioner.id &&
        item.id !== approvedPractitioner.id,
    ) ?? availablePractitioners[1];

  const runtime = {
    backend: "online",
    web: WEB_URL,
    patient: patientSession.user.primaryEmail,
    practitionerSlugs: {
      pending: pendingPractitioner.slug,
      approved: approvedPractitioner.slug,
      rejected: rejectedPractitioner.slug,
    },
    screenshots: [],
    actions: [],
    blocked: [],
    states: {},
  };

  const initialSecondSupport = await listSupport(
    secondPatientSession.tokens.accessToken,
  );
  const initialSecondCare = await listCareRequests(
    secondPatientSession.tokens.accessToken,
  );
  runtime.states.secondPatientSupportCount =
    initialSecondSupport.data.items.length;
  runtime.states.secondPatientCareRequestCount =
    initialSecondCare.data.items.length;

  const now = Date.now();
  const supportEmpty = await createSupportTicket(
    patientSession.tokens.accessToken,
    {
      category: "GENERAL",
      subject: `Phase3 empty-state probe ${now}`,
      description:
        "Fresh support ticket to validate no-messages state before any replies.",
    },
  );
  const supportThread = await createSupportTicket(
    patientSession.tokens.accessToken,
    {
      category: "TECHNICAL",
      subject: `Phase3 threaded ticket ${now}`,
      description:
        "Ticket used to validate real support message thread rendering.",
    },
  );

  runtime.actions.push(
    "Created two patient support tickets via POST /patients/me/support/tickets",
  );

  await addPatientSupportMessage(
    patientSession.tokens.accessToken,
    supportThread.data.item.id,
    "هذه رسالة مريض فعلية لاختبار خيط المحادثة في الدعم.",
  );
  await addAdminSupportMessage(
    adminAccessToken,
    supportThread.data.item.id,
    "تم استلام طلبك من الدعم وسنقوم بالمتابعة.",
  );
  await closeSupportTicket(adminAccessToken, supportThread.data.item.id);
  runtime.actions.push(
    "Added patient/admin support messages and closed one ticket via admin contract",
  );

  const pendingRequest = pendingExisting
    ? { data: { item: pendingExisting } }
    : await createCareRequest(patientSession.tokens.accessToken, {
        practitionerSlug: pendingPractitioner.slug,
        reason: "طلب pending لإثبات حالة المراجعة.",
      });
  const approvedRequest = await createCareRequest(
    patientSession.tokens.accessToken,
    {
      practitionerSlug: approvedPractitioner.slug,
      reason: "طلب approve لإثبات المحادثة المعتمدة.",
    },
  );
  const rejectedRequest = await createCareRequest(
    patientSession.tokens.accessToken,
    {
      practitionerSlug: rejectedPractitioner.slug,
      reason: "طلب reject لإثبات حالة الرفض.",
    },
  );
  runtime.actions.push(
    pendingExisting
      ? "Reused existing pending care-chat request and created approved/rejected requests via POST /patients/me/care-chat/requests"
      : "Created three care-chat requests via POST /patients/me/care-chat/requests",
  );

  const approvedDecision = await decideCareRequest(
    adminAccessToken,
    approvedRequest.data.item.id,
    "APPROVE",
    "Approved during automated phase 3 proof run.",
  );
  const rejectedDecision = await decideCareRequest(
    adminAccessToken,
    rejectedRequest.data.item.id,
    "REJECT",
    "Rejected during automated phase 3 proof run.",
  );
  runtime.actions.push(
    "Approved one care-chat request and rejected one via PATCH /admin/care-chat/requests/:id/decision",
  );

  const conversationId = approvedDecision.data.item.linkedConversationId;
  if (!conversationId) {
    runtime.blocked.push(
      "Approved care-chat request did not return linkedConversationId; conversation screenshot unavailable.",
    );
  } else {
    await sendCareMessage(
      patientSession.tokens.accessToken,
      conversationId,
      "رسالة فعلية من المريض داخل محادثة الرعاية المعتمدة.",
    );
    runtime.actions.push(
      "Sent a patient message inside the approved care-chat conversation",
    );
  }

  const browser = await chromium.launch({ headless: true });
  const patientContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await patientContext.newPage();
  await loginViaUi(page, patientCreds);

  await capture(page, "/", "01-home-journey-summary.png");
  runtime.screenshots.push("01-home-journey-summary.png");

  await capture(page, "/support", "02-support-list.png");
  runtime.screenshots.push("02-support-list.png");

  await capture(page, "/support/new", "03-support-new.png");
  runtime.screenshots.push("03-support-new.png");

  await capture(
    page,
    `/support/${supportEmpty.data.item.id}`,
    "04-support-detail-no-messages.png",
  );
  runtime.screenshots.push("04-support-detail-no-messages.png");

  await capture(
    page,
    `/support/${supportThread.data.item.id}`,
    "05-support-detail-thread-closed.png",
  );
  runtime.screenshots.push("05-support-detail-thread-closed.png");

  await capture(page, "/care-chat", "06-care-chat-list.png");
  runtime.screenshots.push("06-care-chat-list.png");

  await capture(page, "/care-chat/new", "07-care-chat-new-request.png");
  runtime.screenshots.push("07-care-chat-new-request.png");

  await capture(
    page,
    `/care-chat/request/${pendingRequest.data.item.id}`,
    "08-care-chat-request-detail-pending.png",
  );
  runtime.screenshots.push("08-care-chat-request-detail-pending.png");

  await page.goto(`${WEB_URL}/care-chat`, { waitUntil: "networkidle" });
  await page
    .getByText("السابقة", { exact: true })
    .click()
    .catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(OUT_DIR, "09-care-chat-history-rejected.png"),
    fullPage: true,
  });
  runtime.screenshots.push("09-care-chat-history-rejected.png");

  if (conversationId) {
    await capture(
      page,
      `/care-chat/${conversationId}`,
      "10-care-chat-approved-conversation.png",
      2200,
    );
    runtime.screenshots.push("10-care-chat-approved-conversation.png");
  }

  const secondContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const secondPage = await secondContext.newPage();
  await loginViaUi(secondPage, patient2Creds);
  if (initialSecondSupport.data.items.length === 0) {
    await capture(secondPage, "/support", "11-support-empty-state.png");
    runtime.screenshots.push("11-support-empty-state.png");
  } else {
    runtime.blocked.push(
      "Second seeded patient did not have empty support state, so empty-state screenshot was not captured.",
    );
  }

  await browser.close();

  runtime.states.careChat = {
    pending: pendingRequest.data.item.status,
    approved: approvedDecision.data.item.status,
    rejected: rejectedDecision.data.item.status,
    approvedConversationId: conversationId ?? null,
  };
  runtime.states.support = {
    noMessageTicketStatus: supportEmpty.data.item.status,
    closedThreadTicketStatus: "CLOSED",
  };

  await fs.writeFile(
    path.join(OUT_DIR, "phase3-runtime-summary.json"),
    JSON.stringify(runtime, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(runtime, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
