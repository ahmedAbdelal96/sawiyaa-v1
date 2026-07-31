import { describe, expect, it } from "vitest";
import {
  getProfessionalTitleLabel,
  PROFESSIONAL_TITLE_OPTIONS,
} from "./reference-data";

describe("professional title display", () => {
  it("localizes every approved value", () => {
    for (const option of PROFESSIONAL_TITLE_OPTIONS) {
      expect(getProfessionalTitleLabel(option.value, "ar")).toBe(option.label.ar);
      expect(getProfessionalTitleLabel(option.value, "en")).toBe(option.label.en);
    }
  });

  it("maps only known unambiguous legacy values", () => {
    expect(getProfessionalTitleLabel("Psychologist", "ar")).toBe("\u0623\u062e\u0635\u0627\u0626\u064a \u0646\u0641\u0633\u064a");
    expect(getProfessionalTitleLabel("Clinical psychologist", "en")).toBe("Clinical Psychologist");
    expect(getProfessionalTitleLabel("Consultant psychiatrist", "en")).toBe("Consultant psychiatrist");
  });

  it("preserves unknown readable values and handles empty values", () => {
    expect(getProfessionalTitleLabel("E2E Development Practitioner", "en")).toBe("E2E Development Practitioner");
    expect(getProfessionalTitleLabel(null, "ar")).toBe("");
    expect(getProfessionalTitleLabel("  ", "en")).toBe("");
  });
});
