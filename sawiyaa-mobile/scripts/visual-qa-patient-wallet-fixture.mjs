import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

const wallet = {
  id: "wallet-visual",
  currencyCode: "EGP",
  availableBalance: "500.00",
  reservedBalance: "0.00",
  lifetimeCredited: "500.00",
  lifetimeDebited: "350.00",
  lastEntryAt: "2026-08-16T10:00:00.000Z",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-16T10:00:00.000Z",
};

function entry({ id, entryType, direction, amount, effectiveAt, sessionId = null, refundId = null, paymentId = null, currencyCode = "EGP" }) {
  return {
    id,
    entryType,
    direction,
    amount,
    currencyCode,
    description: null,
    paymentId,
    refundId,
    sessionId,
    referenceType: null,
    referenceId: null,
    effectiveAt,
    createdAt: effectiveAt,
  };
}

const entries = [
  entry({ id: "refund-1", entryType: "REFUND_CREDIT", direction: "CREDIT", amount: "500.00", effectiveAt: "2026-08-16T10:00:00.000Z", refundId: "refund-1" }),
  entry({ id: "release-1", entryType: "SESSION_PAYMENT_RELEASE", direction: "CREDIT", amount: "200.00", effectiveAt: "2026-08-14T12:00:00.000Z", sessionId: "visual-session" }),
  entry({ id: "capture-1", entryType: "SESSION_PAYMENT_CAPTURE", direction: "DEBIT", amount: "350.00", effectiveAt: "2026-08-12T09:00:00.000Z", sessionId: "visual-session", paymentId: "payment-1" }),
];

const payments = [
  {
    id: "payment-1",
    sessionId: "visual-session",
    provider: "PAYMOB",
    status: "CAPTURED",
    amount: "350.00",
    amountSubtotal: "350.00",
    amountDiscount: "0.00",
    amountTotal: "350.00",
    amountFromWallet: "0.00",
    amountFromGateway: "350.00",
    currency: "EGP",
    regionalPricingMode: "EGYPT_LOCAL",
    resolvedCountryIsoCode: "EG",
    providerPaymentId: "provider-id",
    providerReference: "provider-reference",
    providerMethod: "CARD",
    checkoutUrl: null,
    clientSecret: null,
    paidAt: "2026-08-12T09:00:00.000Z",
    failedAt: null,
    expiredAt: null,
    refundedAt: null,
    createdAt: "2026-08-12T08:59:00.000Z",
    paymentAction: { canPay: false, reason: "COMPLETED" },
  },
];

export function installPatientWalletFixtureRoutes(page) {
  return page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const state = new URL(page.url()).searchParams.get("walletState") ?? "populated";

    if (pathname.endsWith("/auth/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({
        userId: patientVisualQaAuth.user.id,
        roles: ["PATIENT"],
        sessionId: "visual-qa-patient-session",
        authMethod: "access",
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        featureFlags: [],
      }) });
      return;
    }

    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ ...patientVisualQaAuth, nextStep: "AUTHENTICATED" }) });
      return;
    }

    if (pathname.endsWith("/patients/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope(patientProfile) });
      return;
    }

    if (pathname.endsWith("/notifications/me/unread-count") || pathname.endsWith("/chat/conversations/unread-summary")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: { unreadCount: 0, totalUnreadMessages: 0 } }) });
      return;
    }

    if (pathname.endsWith("/patients/me/wallet")) {
      if (state === "loading") {
        await new Promise((resolve) => setTimeout(resolve, 7000));
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: wallet }) });
      return;
    }

    if (pathname.endsWith("/patients/me/wallet/entries")) {
      if (state === "error") {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "PAYMENT_PROVIDER_UNAVAILABLE" }) });
      } else {
        const items = state === "empty" ? [] : state === "refund" ? [entries[0]] : entries;
        await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ items, pagination: { page: 1, limit: 50, totalItems: items.length, totalPages: 1 } }) });
      }
      return;
    }

    if (pathname.endsWith("/patients/me/payments")) {
      if (state === "error") {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "PAYMENT_PROVIDER_UNAVAILABLE" }) });
      } else {
        const items = state === "empty" || state === "refund" ? [] : payments;
        await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ items, pagination: { page: 1, limit: 50, totalItems: items.length, totalPages: 1 } }) });
      }
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: apiEnvelope({ item: null, items: [], pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 } }) });
  });
}
