import fs from "node:fs";
import path from "node:path";

import { apiClient } from "../../src/lib/api";
import { confirmAvailabilityWeekRepeat, previewAvailabilityWeekRepeat } from "../../src/features/practitioner/availability/api";
import { invalidateAvailability, practitionerAvailabilityQueryKeys } from "../../src/features/practitioner/availability/cache";

jest.mock("../../src/lib/api", () => ({
  apiClient: { post: jest.fn() },
  extractApiData: (response: { data: { data: unknown } }) => response.data.data,
}));

describe("availability repeat contract", () => {
  const post = apiClient.post as jest.Mock;

  beforeEach(() => post.mockReset());

  it("preserves the preview source, target dates, and idempotency payload", async () => {
    post.mockResolvedValue({ data: { data: { operationId: "operation-1" } } });

    await previewAvailabilityWeekRepeat("source-week", ["2026-08-23"], "repeat-key");

    expect(post).toHaveBeenCalledWith(
      "/practitioners/me/availability/weeks/source-week/repeat/preview",
      { targetWeekStartDates: ["2026-08-23"], idempotencyKey: "repeat-key" },
    );
  });

  it("preserves the confirm operation and idempotency payload", async () => {
    post.mockResolvedValue({ data: { data: { status: "COMPLETED" } } });

    await confirmAvailabilityWeekRepeat("source-week", { operationId: "operation-1", idempotencyKey: "repeat-key" });

    expect(post).toHaveBeenCalledWith(
      "/practitioners/me/availability/weeks/source-week/repeat/confirm",
      { operationId: "operation-1", idempotencyKey: "repeat-key" },
    );
  });

  it("invalidates the rolling window and source-week detail after confirmation", async () => {
    const queryClient = { invalidateQueries: jest.fn().mockResolvedValue(undefined) };

    await invalidateAvailability(queryClient as never, "source-week");

    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: practitionerAvailabilityQueryKeys.weeks() });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: practitionerAvailabilityQueryKeys.details("source-week") });
  });

  it("keeps recurrence copy complete in Arabic and English", () => {
    const load = (locale: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "i18n", "locales", `${locale}.json`), "utf8"));
    const ar = load("ar");
    const en = load("en");

    expect(ar.practitioner.schedule.repeatWeekly).toBe("تكرار جدول الأسبوع");
    expect(en.practitioner.schedule.repeatWeekly).toBe("Repeat weekly schedule");
    expect(ar.practitioner.availability.confirmRepeat).toBeTruthy();
    expect(en.practitioner.availability.confirmRepeat).toBeTruthy();
  });
});
