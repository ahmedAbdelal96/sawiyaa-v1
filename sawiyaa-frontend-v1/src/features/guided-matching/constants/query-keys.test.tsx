import { describe, expect, it } from "vitest";
import { guidedMatchingQueryKeys } from "./query-keys";

describe("guided matching query keys", () => {
  it("isolates localized result reads while retaining the root key", () => {
    const ar = guidedMatchingQueryKeys.detail("matching-1", "ar");
    const en = guidedMatchingQueryKeys.detail("matching-1", "en");

    expect(ar).not.toEqual(en);
    expect(ar.slice(0, 3)).toEqual(["guided-matching", "detail", "matching-1"]);
    expect(en.slice(0, 3)).toEqual(["guided-matching", "detail", "matching-1"]);
  });
});
