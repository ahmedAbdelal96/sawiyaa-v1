import { describe, expect, it } from "vitest";
import { buildProviderLaunchUrl } from "./session-runtime";

describe("buildProviderLaunchUrl", () => {
  it("keeps the Daily meeting token for redirect launches", () => {
    expect(
      buildProviderLaunchUrl({
        name: "DAILY",
        roomId: "fayed-session-test",
        roomUrl: "https://fayed-test.daily.co/fayed-session-test",
        token: "daily-meeting-token",
        tokenExpiresAt: "2026-08-08T13:00:00.000Z",
        joinMode: "redirect_url",
        payload: {},
      }),
    ).toBe(
      "https://fayed-test.daily.co/fayed-session-test?t=daily-meeting-token",
    );
  });

  it("does not invent a launch URL for a private Daily runtime without a token", () => {
    expect(
      buildProviderLaunchUrl({
        name: "DAILY",
        roomId: "fayed-session-test",
        roomUrl: "https://fayed-test.daily.co/fayed-session-test",
        token: null,
        tokenExpiresAt: null,
        joinMode: "redirect_url",
        payload: {},
      }),
    ).toBeNull();
  });
});
