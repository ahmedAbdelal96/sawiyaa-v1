import { describe, expect, it } from "vitest";
import {
  nextSessionQueryKey,
  patientSessionQueryKeys,
  practitionerSessionQueryKeys,
} from "./use-sessions";

describe("session query identities", () => {
  it("separates locale-sensitive detail reads while retaining the session prefix", () => {
    const patientAr = patientSessionQueryKeys.detail("session-1", "ar");
    const patientEn = patientSessionQueryKeys.detail("session-1", "en");
    const practitionerAr = practitionerSessionQueryKeys.detail("session-1", "ar");
    const practitionerEn = practitionerSessionQueryKeys.detail("session-1", "en");

    expect(patientAr).not.toEqual(patientEn);
    expect(practitionerAr).not.toEqual(practitionerEn);
    expect(patientAr.slice(0, patientSessionQueryKeys.all.length)).toEqual(
      patientSessionQueryKeys.all,
    );
    expect(practitionerAr.slice(0, practitionerSessionQueryKeys.all.length)).toEqual(
      practitionerSessionQueryKeys.all,
    );
  });

  it("keeps next-session identity stable because its response has no professional title", () => {
    expect(nextSessionQueryKey).toEqual(["my-next-session"]);
  });
});
