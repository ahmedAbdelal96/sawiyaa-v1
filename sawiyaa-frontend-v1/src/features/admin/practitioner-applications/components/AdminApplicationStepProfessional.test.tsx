import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminApplicationStepProfessional from "./AdminApplicationStepProfessional";
import type { AdminProfessionalContentReview } from "../types/practitioner-applications.types";

const review: AdminProfessionalContentReview = {
  currentApproved: {
    readiness: {
      primaryContentLocale: "ar",
      locales: {
        ar: {
          professionalTitle: "معالج",
          bio: "نبذة عربية",
          titleComplete: true,
          bioComplete: true,
          complete: true,
        },
        en: {
          professionalTitle: null,
          bio: null,
          titleComplete: false,
          bioComplete: false,
          complete: false,
        },
      },
      bilingualComplete: false,
      fallbackActive: true,
      sourceLocaleUnresolved: false,
    },
    legacyContent: null,
    legacySnapshot: false,
  },
  proposed: {
    readiness: {
      primaryContentLocale: "ar",
      locales: {
        ar: {
          professionalTitle: "معالج",
          bio: "نبذة عربية",
          titleComplete: true,
          bioComplete: true,
          complete: true,
        },
        en: {
          professionalTitle: "Therapist",
          bio: "English bio",
          titleComplete: true,
          bioComplete: true,
          complete: true,
        },
      },
      bilingualComplete: true,
      fallbackActive: false,
      sourceLocaleUnresolved: false,
    },
    legacyContent: null,
    legacySnapshot: false,
  },
  changedFields: [
    {
      path: "professionalContent.en.bio",
      locale: "en",
      field: "bio",
      status: "ADDED",
      currentValue: null,
      proposedValue: "English bio",
    },
  ],
};

const labels = {
  sectionTitle: "Professional content",
  primaryLanguage: "Primary content language",
  notSpecified: "Not specified / unresolved",
  arabic: "Arabic",
  english: "English",
  complete: "Complete",
  incomplete: "Incomplete",
  bilingualComplete: "Bilingual content complete",
  bilingualIncomplete: "Bilingual content incomplete",
  fallbackActive: "Fallback currently required",
  sourceLocaleUnresolved: "Source language not confirmed",
  currentApproved: "Current approved",
  proposed: "Proposed",
  professionalTitle: "Professional title",
  bio: "Bio",
  noContent: "No content provided",
  changedFields: "Changed fields",
  added: "Added",
  removed: "Removed",
  modified: "Modified",
  legacyContent: "Legacy/default professional content",
  legacySourceUnresolved: "Source language not confirmed",
};

describe("AdminApplicationStepProfessional professional content review", () => {
  it("renders current/proposed locale content and directional locale containers", () => {
    const { container } = render(
      <AdminApplicationStepProfessional
        profileRows={[]}
        bio="English bio"
        prices={[]}
        differences={[]}
        noDifferencesLabel="No differences"
        liveValueLabel="Current value"
        requestedValueLabel="Submitted value"
        bioLabel="Bio"
        differencesLabel="Important differences"
        professionalContentReview={review}
        professionalContentLabels={labels}
      />,
    );

    expect(screen.getByText("Professional content")).toBeTruthy();
    expect(screen.getByText("Bilingual content complete")).toBeTruthy();
    expect(screen.getAllByText("معالج")).toHaveLength(2);
    expect(screen.getAllByText("English bio")).toHaveLength(2);
    expect(screen.getByText("Added")).toBeTruthy();
    expect(container.querySelector('[dir="ar"]')).not.toBeNull();
    expect(container.querySelector('[dir="en"]')).not.toBeNull();
  });
});
