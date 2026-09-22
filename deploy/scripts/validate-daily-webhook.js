"use strict";

const fs = require("node:fs");

const REQUIRED_EVENTS = new Set([
  "participant.joined",
  "participant.left",
  "meeting.started",
  "meeting.ended",
]);
const REQUEST_TIMEOUT_MS = 5000;

function expectedCallbackUrl(webAppUrl) {
  return `${String(webAppUrl || "").trim().replace(/\/+$/, "")}/api/v1/sessions/webhooks/daily`;
}

function listSubscriptions(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.webhooks)) return payload.webhooks;
  return [];
}

function subscriptionEvents(subscription) {
  const value = subscription.eventTypes ?? subscription.events ?? subscription.event_types;
  return Array.isArray(value) ? value.map(String) : [];
}

function validateDailyWebhookPayload(payload, configuredUrl) {
  const expected = expectedCallbackUrl(configuredUrl);
  const subscriptions = listSubscriptions(payload);
  const exact = subscriptions.find((item) => String(item?.url ?? item?.callback_url ?? "").trim() === expected);
  if (!exact) return { ok: false, code: "DAILY_WEBHOOK_URL_MISSING_OR_WRONG" };
  const state = String(exact.state ?? exact.status ?? "").toUpperCase();
  if (["FAILED", "INACTIVE", "DISABLED"].includes(state)) {
    return { ok: false, code: `DAILY_WEBHOOK_STATE_${state}` };
  }
  const missingEvents = [...REQUIRED_EVENTS].filter((event) => !subscriptionEvents(exact).includes(event));
  if (missingEvents.length) return { ok: false, code: "DAILY_WEBHOOK_EVENTS_INCOMPLETE", missingEvents };
  return { ok: true, code: "DAILY_WEBHOOK_READY" };
}

function readEnvFile(file) {
  const values = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return values;
}

async function main() {
  const envFile = process.argv[2];
  if (!envFile) throw new Error("Usage: node validate-daily-webhook.js <backend-env-file>");
  const env = readEnvFile(envFile);
  const baseUrl = String(env.DAILY_API_BASE_URL || "").replace(/\/+$/, "");
  if (!env.DAILY_API_KEY || !baseUrl || !env.WEB_APP_URL) {
    console.error("BLOCKING DAILY_WEBHOOK_CONFIGURATION_INCOMPLETE");
    process.exitCode = 1;
    return;
  }
  const response = await fetch(`${baseUrl}/webhooks`, {
    headers: { Authorization: `Bearer ${env.DAILY_API_KEY}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    console.error(`BLOCKING DAILY_WEBHOOK_API_UNAVAILABLE status=${response.status}`);
    process.exitCode = 1;
    return;
  }
  const result = validateDailyWebhookPayload(await response.json(), env.WEB_APP_URL);
  if (!result.ok) {
    console.error(`BLOCKING ${result.code}`);
    process.exitCode = 1;
    return;
  }
  console.log("PASS DAILY_WEBHOOK_READY");
}

if (require.main === module) main().catch(() => {
  console.error("BLOCKING DAILY_WEBHOOK_API_UNAVAILABLE");
  process.exitCode = 1;
});

module.exports = { REQUIRED_EVENTS, expectedCallbackUrl, validateDailyWebhookPayload };
