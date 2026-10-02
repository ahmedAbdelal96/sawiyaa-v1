import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");

describe("patient practitioner-view tracking contract", () => {
  it("does not invoke the patient-only endpoint for guests or non-patients", () => {
    const screen = readFileSync(
      resolve(root, "app/(public)/discovery/[slug].tsx"),
      "utf8",
    );
    const hook = readFileSync(
      resolve(root, "src/features/patient/journey/hooks.ts"),
      "utf8",
    );

    expect(screen).toContain('authContext?.role !== "patient"');
    expect(hook).toContain('useAuthenticatedQueryEnabled("patient")');
    expect(hook).toContain("if (!enabled)");
  });
});
