import { describe, expect, it } from "vitest";

import { normalizeAttendanceStatus } from "./AdminAcademyProgramAttendanceScreen";

describe("AdminAcademyProgramAttendanceScreen attendance status", () => {
  it("keeps unrecorded attendance distinct from absent", () => {
    expect(normalizeAttendanceStatus("PRESENT")).toBe("PRESENT");
    expect(normalizeAttendanceStatus("ABSENT")).toBe("ABSENT");
    expect(normalizeAttendanceStatus("UNMARKED")).toBe("UNMARKED");
    expect(normalizeAttendanceStatus(undefined)).toBe("UNMARKED");
  });
});
