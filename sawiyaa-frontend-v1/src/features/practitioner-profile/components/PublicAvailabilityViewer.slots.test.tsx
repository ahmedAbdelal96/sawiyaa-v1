import { afterEach, describe, expect, it, vi } from "vitest";
import { projectAvailabilityWindow } from "../lib/public-availability-slot-projection";

describe("PublicAvailabilityViewer slot projection", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps the exact published 60-minute window start", () => {
    vi.setSystemTime(new Date("2026-09-16T08:00:00.000Z"));

    expect(
      projectAvailabilityWindow({
        startsAt: "2026-09-17T10:00:00.000Z",
        endsAt: "2026-09-17T11:00:00.000Z",
        durationMinutes: 60,
      }),
    ).toEqual([
      {
        startsAt: "2026-09-17T10:00:00.000Z",
        windowEndsAt: "2026-09-17T11:00:00.000Z",
        maxDuration: 60,
      },
    ]);
  });

  it("does not synthesize an extra half-hour start inside a 60-minute window", () => {
    vi.setSystemTime(new Date("2026-09-16T08:00:00.000Z"));

    const slots = projectAvailabilityWindow({
      startsAt: "2026-09-17T10:00:00.000Z",
      endsAt: "2026-09-17T11:00:00.000Z",
      durationMinutes: 60,
    });

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      "2026-09-17T10:00:00.000Z",
    ]);
  });

  it("keeps 30-minute windows ineligible for a 60-minute selection", () => {
    vi.setSystemTime(new Date("2026-09-16T08:00:00.000Z"));

    expect(
      projectAvailabilityWindow({
        startsAt: "2026-09-17T10:00:00.000Z",
        endsAt: "2026-09-17T10:30:00.000Z",
        durationMinutes: 30,
      })[0]?.maxDuration,
    ).toBe(30);
  });

  it("keeps future 30-minute starts when the backend clips a merged window at now", () => {
    vi.setSystemTime(new Date("2026-09-21T20:33:07.000Z"));

    expect(
      projectAvailabilityWindow({
        startsAt: "2026-09-21T20:33:07.000Z",
        endsAt: "2026-09-21T21:30:00.000Z",
        durationMinutes: 30,
      }),
    ).toEqual([
      {
        startsAt: "2026-09-21T21:00:00.000Z",
        windowEndsAt: "2026-09-21T21:30:00.000Z",
        maxDuration: 30,
      },
    ]);
  });
});
