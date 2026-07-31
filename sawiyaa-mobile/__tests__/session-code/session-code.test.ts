import { getSessionCodeDisplay } from "../../src/components/shared/session-code";

describe("Mobile Session Code display contract", () => {
  it("displays the canonical public code unchanged", () => {
    expect(getSessionCodeDisplay("S-260729-0042", "Session Code Unavailable")).toBe("S-260729-0042");
  });

  it("uses an explicit missing state and never falls back to an identifier", () => {
    expect(getSessionCodeDisplay(null, "Session Code Unavailable")).toBe("Session Code Unavailable");
    expect(getSessionCodeDisplay("   ", "Session Code Unavailable")).toBe("Session Code Unavailable");
  });
});
