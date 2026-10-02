import { buildSlotsFromWindows } from "../src/features/patient/sessions/slot-utils";

describe("patient booking availability projection", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps future 30-minute starts when the backend clips a merged window at now", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-21T20:33:07.000Z"));

    expect(
      buildSlotsFromWindows([
        {
          startsAt: "2026-09-21T20:33:07.000Z",
          endsAt: "2026-09-21T21:30:00.000Z",
          durationMinutes: 30,
        },
      ]),
    ).toEqual([
      {
        startsAt: "2026-09-21T21:00:00.000Z",
        windowEndsAt: "2026-09-21T21:30:00.000Z",
        durationMinutes: 30,
      },
    ]);
  });
});
