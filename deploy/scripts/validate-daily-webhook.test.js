"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { expectedCallbackUrl, validateDailyWebhookPayload } = require("./validate-daily-webhook.js");

const url = "https://sawiyaa.test";
const events = ["participant.joined", "participant.left", "meeting.started", "meeting.ended"];
const subscription = (overrides = {}) => ({ url: expectedCallbackUrl(url), state: "ACTIVE", eventTypes: events, ...overrides });

test("accepts the exact active Daily subscription with required events", () => {
  assert.deepEqual(validateDailyWebhookPayload({ data: [subscription()] }, url), { ok: true, code: "DAILY_WEBHOOK_READY" });
});
test("rejects missing or wrong callback URL", () => {
  assert.equal(validateDailyWebhookPayload({ data: [subscription({ url: "https://wrong.test/hook" })] }, url).code, "DAILY_WEBHOOK_URL_MISSING_OR_WRONG");
});
test("rejects failed subscriptions", () => {
  assert.equal(validateDailyWebhookPayload({ data: [subscription({ state: "FAILED" })] }, url).code, "DAILY_WEBHOOK_STATE_FAILED");
});
test("rejects subscriptions missing required event types", () => {
  assert.equal(validateDailyWebhookPayload({ data: [subscription({ eventTypes: ["participant.joined"] })] }, url).code, "DAILY_WEBHOOK_EVENTS_INCOMPLETE");
});
