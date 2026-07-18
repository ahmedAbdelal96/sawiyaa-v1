/**
 * __tests__/messages/utils-presenter.test.ts
 *
 * Behavioral contract tests for Phase 4B.3 — runtime closeout.
 *
 * Covers:
 *   §1  Support employee identity preservation
 *   §2  Support queue-state status labels (patient/practitioner perspective)
 *   §3  Semantic status tones (ConversationStatusTone)
 */

import {
  getMessageSenderLabel,
  getMessageSenderRoleLabel,
  getConversationStatusPresentation,
  CONVERSATION_STATUS_TONE_COLORS,
  type ConversationStatusTone,
} from "../../src/features/messages/utils";
import type { GeneralChatMessageItemDto } from "../../src/features/messages/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(
  overrides: Partial<GeneralChatMessageItemDto> = {},
): GeneralChatMessageItemDto {
  return {
    id: "msg_1",
    conversationId: "conv_1",
    senderUserId: "u_support_1",
    messageType: "TEXT",
    body: "Hello",
    createdAt: new Date().toISOString(),
    senderIdentity: null,
    ...overrides,
  } as unknown as GeneralChatMessageItemDto;
}

function makeConversation(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: "conv_1",
    type: "SUPPORT",
    status: "OPEN",
    isResolved: false,
    supportQueueState: null,
    ...overrides,
  };
}

const SUPPORT_USER_ID = "u_support_1";
const PATIENT_USER_ID = "u_patient_1";

// ---------------------------------------------------------------------------
// §1  Support employee identity
// ---------------------------------------------------------------------------

describe("§1 Support employee identity preservation", () => {
  test("1.1 Actual employee display name is preserved — not replaced by generic label", () => {
    const msg = makeMessage({
      senderUserId: SUPPORT_USER_ID,
      senderIdentity: {
        displayName: "محمد أحمد",
        publicRoleLabel: "Support team",
        avatarUrl: "https://cdn.sawiyaa.com/avatars/u_support_1.jpg",
      } as any,
    });

    const label = getMessageSenderLabel(msg, PATIENT_USER_ID, "patient", "ar");
    expect(label).toBe("محمد أحمد");
    expect(label).not.toBe("فريق دعم سويّة");
  });

  test("1.2 Actual employee avatar URL is exposed via senderIdentity — not suppressed", () => {
    const identity = {
      displayName: "Sara Ali",
      publicRoleLabel: "Support team",
      avatarUrl: "https://cdn.sawiyaa.com/avatars/sara.jpg",
    } as any;

    const msg = makeMessage({
      senderUserId: SUPPORT_USER_ID,
      senderIdentity: identity,
    });

    // The avatar should be accessible to the UI directly from senderIdentity
    expect(msg.senderIdentity?.avatarUrl).toBe("https://cdn.sawiyaa.com/avatars/sara.jpg");

    // And the display label remains the real name, not the generic one
    const label = getMessageSenderLabel(msg, PATIENT_USER_ID, "patient", "en");
    expect(label).toBe("Sara Ali");
  });

  test("1.3 Two different employees in the same ticket produce different sender labels", () => {
    const emp1 = makeMessage({
      senderUserId: "u_support_1",
      senderIdentity: {
        displayName: "أحمد خليل",
        publicRoleLabel: "Support team",
        avatarUrl: "https://cdn.sawiyaa.com/avatars/ahmed.jpg",
      } as any,
    });

    const emp2 = makeMessage({
      senderUserId: "u_support_2",
      senderIdentity: {
        displayName: "سارة علي",
        publicRoleLabel: "Support team",
        avatarUrl: "https://cdn.sawiyaa.com/avatars/sara.jpg",
      } as any,
    });

    const label1 = getMessageSenderLabel(emp1, PATIENT_USER_ID, "patient", "ar");
    const label2 = getMessageSenderLabel(emp2, PATIENT_USER_ID, "patient", "ar");

    expect(label1).toBe("أحمد خليل");
    expect(label2).toBe("سارة علي");
    expect(label1).not.toBe(label2);
  });

  test("1.4 Missing identity uses the safe localized fallback — AR", () => {
    const msg = makeMessage({
      senderUserId: SUPPORT_USER_ID,
      senderIdentity: {
        displayName: null,
        publicRoleLabel: "Support team",
        avatarUrl: null,
      } as any,
    });

    const label = getMessageSenderLabel(msg, PATIENT_USER_ID, "patient", "ar");
    expect(label).toBe("عضو في فريق الدعم");
  });

  test("1.4 Missing identity uses the safe localized fallback — EN", () => {
    const msg = makeMessage({
      senderUserId: SUPPORT_USER_ID,
      senderIdentity: {
        displayName: null,
        publicRoleLabel: "Support team",
        avatarUrl: null,
      } as any,
    });

    const label = getMessageSenderLabel(msg, PATIENT_USER_ID, "patient", "en");
    expect(label).toBe("Support team member");
  });

  test("1.5 Staff email, IDs, permissions, and internal roles are not rendered", () => {
    // Even if identity leaks internal data, getMessageSenderLabel must NOT expose it.
    const msg = makeMessage({
      senderUserId: SUPPORT_USER_ID,
      senderIdentity: {
        displayName: "Tariq Hassan",
        publicRoleLabel: "Support team",
        email: "tariq@internal.sawiyaa.com",
        internalRole: "SUPPORT_TIER_2",
        permissions: ["RESOLVE_TICKET", "ESCALATE"],
        userId: "u_support_99",
      } as any,
    });

    const label = getMessageSenderLabel(msg, PATIENT_USER_ID, "patient", "en");

    // Only actual display name is rendered
    expect(label).toBe("Tariq Hassan");
    expect(label).not.toContain("internal.sawiyaa.com");
    expect(label).not.toContain("SUPPORT_TIER_2");
    expect(label).not.toContain("RESOLVE_TICKET");
    expect(label).not.toContain("u_support_99");

    // Role label must also avoid leaking internal data
    const roleLabel = getMessageSenderRoleLabel(msg, PATIENT_USER_ID, "patient", "en");
    expect(roleLabel).toBe("Support Team");
    expect(roleLabel).not.toContain("internal.sawiyaa.com");
    expect(roleLabel).not.toContain("SUPPORT_TIER_2");
  });
});

// ---------------------------------------------------------------------------
// §2  Support queue-state status labels
// ---------------------------------------------------------------------------

describe("§2 Support queue-state status copy (patient/practitioner perspective)", () => {
  test("2.1 NEEDS_SUPPORT_REPLY → في انتظار رد الدعم (AR)", () => {
    const result = getConversationStatusPresentation(
      makeConversation({ supportQueueState: "NEEDS_SUPPORT_REPLY" }),
      "ar",
    );
    expect(result?.label).toBe("في انتظار رد الدعم");
    expect(result?.tone).toBe("waiting");
  });

  test("2.2 NEEDS_SUPPORT_REPLY → Waiting for support (EN)", () => {
    const result = getConversationStatusPresentation(
      makeConversation({ supportQueueState: "NEEDS_SUPPORT_REPLY" }),
      "en",
    );
    expect(result?.label).toBe("Waiting for support");
    expect(result?.tone).toBe("waiting");
  });

  test("2.3 WAITING_FOR_USER → بانتظار ردك (AR)", () => {
    const result = getConversationStatusPresentation(
      makeConversation({ supportQueueState: "WAITING_FOR_USER" }),
      "ar",
    );
    expect(result?.label).toBe("بانتظار ردك");
    expect(result?.tone).toBe("waiting");
  });

  test("2.4 WAITING_FOR_USER → Waiting for your reply (EN)", () => {
    const result = getConversationStatusPresentation(
      makeConversation({ supportQueueState: "WAITING_FOR_USER" }),
      "en",
    );
    expect(result?.label).toBe("Waiting for your reply");
    expect(result?.tone).toBe("waiting");
  });

  test("2.5 RESOLVED status → تم الحل (AR)", () => {
    const result = getConversationStatusPresentation(
      makeConversation({ status: "RESOLVED", isResolved: true }),
      "ar",
    );
    expect(result?.label).toBe("تم الحل");
    expect(result?.tone).toBe("resolved");
  });

  test("2.6 RESOLVED status → Resolved (EN)", () => {
    const result = getConversationStatusPresentation(
      makeConversation({ status: "RESOLVED", isResolved: true }),
      "en",
    );
    expect(result?.label).toBe("Resolved");
    expect(result?.tone).toBe("resolved");
  });

  test("2.7 Open fallback (no queue state) → مفتوح (AR)", () => {
    const result = getConversationStatusPresentation(
      makeConversation({ supportQueueState: null }),
      "ar",
    );
    expect(result?.label).toBe("مفتوح");
    expect(result?.tone).toBe("neutral");
  });

  test("2.8 Open fallback (no queue state) → Open (EN)", () => {
    const result = getConversationStatusPresentation(
      makeConversation({ supportQueueState: null }),
      "en",
    );
    expect(result?.label).toBe("Open");
    expect(result?.tone).toBe("neutral");
  });

  test("2.9 Ambiguous generic label 'في انتظار الرد' must NOT be returned", () => {
    // Test all queue states to confirm none produce the forbidden label
    for (const queueState of ["NEEDS_SUPPORT_REPLY", "WAITING_FOR_USER", null, undefined]) {
      const result = getConversationStatusPresentation(
        makeConversation({ supportQueueState: queueState }),
        "ar",
      );
      expect(result?.label).not.toBe("في انتظار الرد");
    }
  });
});

// ---------------------------------------------------------------------------
// §3  Semantic status tones
// ---------------------------------------------------------------------------

describe("§3 Semantic status tones (ConversationStatusTone)", () => {
  test("3.1 SESSION Active → tone: active", () => {
    const result = getConversationStatusPresentation(
      { type: "SESSION", status: "ACTIVE", isResolved: false, supportQueueState: null },
      "en",
    );
    expect(result?.tone).toBe("active");
  });

  test("3.2 SESSION Ended → tone: ended", () => {
    const result = getConversationStatusPresentation(
      { type: "SESSION", status: "CLOSED", isResolved: false, supportQueueState: null },
      "en",
    );
    expect(result?.tone).toBe("ended");
  });

  test("3.3 SUPPORT Resolved → tone: resolved", () => {
    const result = getConversationStatusPresentation(
      { type: "SUPPORT", status: "RESOLVED", isResolved: true, supportQueueState: null },
      "en",
    );
    expect(result?.tone).toBe("resolved");
  });

  test("3.4 SUPPORT NEEDS_SUPPORT_REPLY → tone: waiting", () => {
    const result = getConversationStatusPresentation(
      { type: "SUPPORT", status: "OPEN", isResolved: false, supportQueueState: "NEEDS_SUPPORT_REPLY" },
      "en",
    );
    expect(result?.tone).toBe("waiting");
  });

  test("3.5 SUPPORT WAITING_FOR_USER → tone: waiting", () => {
    const result = getConversationStatusPresentation(
      { type: "SUPPORT", status: "OPEN", isResolved: false, supportQueueState: "WAITING_FOR_USER" },
      "en",
    );
    expect(result?.tone).toBe("waiting");
  });

  test("3.6 SUPPORT Open (no queue state) → tone: neutral", () => {
    const result = getConversationStatusPresentation(
      { type: "SUPPORT", status: "OPEN", isResolved: false, supportQueueState: null },
      "en",
    );
    expect(result?.tone).toBe("neutral");
  });

  test("3.7 CONVERSATION_STATUS_TONE_COLORS covers all 5 tone values", () => {
    const allTones: ConversationStatusTone[] = ["active", "waiting", "resolved", "ended", "neutral"];
    for (const tone of allTones) {
      const color = CONVERSATION_STATUS_TONE_COLORS[tone];
      expect(typeof color).toBe("string");
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test("3.8 active and neutral both map to Teal (#24564F)", () => {
    expect(CONVERSATION_STATUS_TONE_COLORS["active"]).toBe("#24564F");
    expect(CONVERSATION_STATUS_TONE_COLORS["neutral"]).toBe("#24564F");
  });

  test("3.9 waiting maps to Warm Gold (#C8A979)", () => {
    expect(CONVERSATION_STATUS_TONE_COLORS["waiting"]).toBe("#C8A979");
  });

  test("3.10 resolved and ended both map to Muted Grey (#6F7E78)", () => {
    expect(CONVERSATION_STATUS_TONE_COLORS["resolved"]).toBe("#6F7E78");
    expect(CONVERSATION_STATUS_TONE_COLORS["ended"]).toBe("#6F7E78");
  });

  test("3.11 null conversation returns null presentation", () => {
    const result = getConversationStatusPresentation(null, "en");
    expect(result).toBeNull();
  });
});
