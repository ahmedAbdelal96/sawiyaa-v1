import { patientSessionsQueryKeys } from "../../src/features/patient/sessions/hooks";
import { practitionerSessionQueryKeys } from "../../src/features/practitioner/sessions/hooks";

jest.mock("../../src/features/auth/query-auth", () => ({
  useAuthenticatedQueryEnabled: () => true,
}));
jest.mock("../../src/features/patient/journey/hooks", () => ({
  patientJourneyQueryKey: ["patient-journey"],
}));
jest.mock("../../src/lib/api", () => ({}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "ar" } }),
}));

describe("session query identities", () => {
  it("separates locale-sensitive detail reads without breaking prefix invalidation", () => {
    const patientAr = patientSessionsQueryKeys.details("session-1", "ar");
    const patientEn = patientSessionsQueryKeys.details("session-1", "en");
    const practitionerAr = practitionerSessionQueryKeys.detail("session-1", "ar");
    const practitionerEn = practitionerSessionQueryKeys.detail("session-1", "en");

    expect(patientAr).not.toEqual(patientEn);
    expect(practitionerAr).not.toEqual(practitionerEn);
    expect(patientAr.slice(0, patientSessionsQueryKeys.all.length)).toEqual(
      patientSessionsQueryKeys.all,
    );
    expect(practitionerAr.slice(0, practitionerSessionQueryKeys.all.length)).toEqual(
      practitionerSessionQueryKeys.all,
    );
  });
});
