import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

export const matchingVisualQaSessionId = "visual-qa-matching-session";

export const matchingVisualQaLocalizedTitles = {
  ar: "أخصائي نفسي إكلينيكي",
  en: "Clinical Psychologist",
};

export const matchingVisualQaSession = {
  sessionId: matchingVisualQaSessionId,
  answers: {
    primaryConcern: "Anxiety support",
    preferredSpecialtySlug: "anxiety",
    preferredLanguage: "en",
    preferredPractitionerGender: "ANY",
    sessionMode: "VIDEO",
    urgency: "FLEXIBLE",
  },
  items: [
    {
      practitioner: {
        id: "visual-qa-practitioner",
        slug: "mona-hassan",
        displayName: "Mona Hassan",
        professionalTitle: "CLINICAL_PSYCHOLOGIST",
        languages: ["ar", "en"],
        gender: "FEMALE",
        sessionPrice30: "350",
        sessionPrice60: "600",
        specialties: ["Anxiety support"],
      },
      score: 88,
      rank: 1,
      rationale: {
        matchedSpecialty: true,
        matchedLanguage: true,
        matchedGenderPreference: true,
        matchedSessionMode: true,
        matchedBudget: true,
        matchedUrgency: true,
        matchedProviderType: false,
        matchedInstantBooking: false,
        scoreBreakdown: {
          specialty: 30,
          language: 15,
          budget: 15,
          urgency: 10,
        },
        notes: ["Matched preferred specialty"],
      },
    },
  ],
  recommendations: [],
};

export function installMatchingVisualQaRoutes(page) {
  return page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const fulfill = (data) =>
      route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: apiEnvelope(data),
      });

    if (pathname.endsWith("/auth/me")) {
      return fulfill({
        userId: patientVisualQaAuth.user.id,
        roles: ["PATIENT"],
        sessionId: matchingVisualQaSessionId,
        authMethod: "access",
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        featureFlags: [],
      });
    }

    if (pathname.includes("/auth/") && pathname.endsWith("/refresh")) {
      return fulfill({
        ...patientVisualQaAuth,
        nextStep: "AUTHENTICATED",
        message: "Visual QA fixture",
      });
    }

    if (pathname.endsWith("/patients/me")) return fulfill(patientProfile);
    if (pathname.endsWith("/notifications/me/unread-count")) {
      return fulfill({ item: { unreadCount: 0 } });
    }
    if (
      pathname.endsWith("/chat/conversations/unread-summary") ||
      pathname.endsWith("/messages/conversations/unread-summary")
    ) {
      return fulfill({ item: { totalUnreadMessages: 0 } });
    }
    if (pathname.endsWith("/users/me/next-session")) return fulfill(null);

    if (
      pathname.endsWith(`/matching/sessions/${matchingVisualQaSessionId}`) ||
      pathname.endsWith("/matching/sessions")
    ) {
      return fulfill(matchingVisualQaSession);
    }

    return fulfill({
      item: null,
      items: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
  });
}

export { patientVisualQaAuth };
