import { describe, expect, it } from "vitest";
import {
  canWriteRuntimeInspector,
  normalizeRuntimeInspectorTab,
} from "./runtime-inspector-state";

describe("runtime inspector state", () => {
  it("normalizes unknown deep-link tabs to overview", () => {
    expect(normalizeRuntimeInspectorTab("attendance")).toBe("attendance");
    expect(normalizeRuntimeInspectorTab("unknown")).toBe("overview");
  });

  it("does not expose write capability while permissions are loading", () => {
    expect(
      canWriteRuntimeInspector(["SESSIONS_MANUAL_DECISIONS_WRITE"], true),
    ).toBe(false);
    expect(
      canWriteRuntimeInspector(["SESSIONS_MANUAL_DECISIONS_WRITE"], false),
    ).toBe(true);
    expect(canWriteRuntimeInspector([], false)).toBe(false);
  });
});
