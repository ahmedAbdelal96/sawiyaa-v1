import { matchingSessionQueryKey } from "../../src/features/patient/matching/query-keys";

describe("matching result query identity", () => {
  it("keeps AR and EN result reads isolated", () => {
    const ar = matchingSessionQueryKey("matching-1", "ar");
    const en = matchingSessionQueryKey("matching-1", "en");

    expect(ar).not.toEqual(en);
    expect(ar.slice(0, 2)).toEqual(["matching-session", "matching-1"]);
    expect(en.slice(0, 2)).toEqual(["matching-session", "matching-1"]);
  });
});
