import { describe, expect, it } from "vitest";
import { getResolutionFormBlocker } from "./resolution-form-validation";

describe("resolution action validation", () => {
  const base = { finding: "TECHNICAL_ISSUE", reasonCode: "TECHNICAL_VIDEO_PROBLEM", notes: "", patientRemedy: "CREDIT_WALLET", replacementStart: "", hasPreview: false, previewMatches: false };
  it("allows ordinary structured decisions without notes before preview", () => expect(getResolutionFormBlocker(base)).toContain("Preview"));
  it("requires notes for OTHER", () => expect(getResolutionFormBlocker({ ...base, finding: "OTHER" })).toContain("explanation"));
  it("requires a replacement time", () => expect(getResolutionFormBlocker({ ...base, patientRemedy: "CREATE_REPLACEMENT_SESSION", hasPreview: true, previewMatches: true })).toContain("replacement"));
  it("blocks stale execution explicitly", () => expect(getResolutionFormBlocker({ ...base, hasPreview: true, previewMatches: false })).toContain("changed"));
});
