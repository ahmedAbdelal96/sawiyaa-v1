import { getDirectionalIcon } from "../src/i18n/directional-icons";

describe("getDirectionalIcon", () => {
  it.each([
    ["back", "arrow-back"],
    ["forward", "arrow-forward"],
    ["previous", "chevron-back"],
    ["next", "chevron-forward"],
    ["disclosure", "chevron-forward"],
  ] as const)("resolves %s in LTR", (semantic, expected) => {
    expect(getDirectionalIcon(semantic, false)).toBe(expected);
  });

  it.each([
    ["back", "arrow-forward"],
    ["forward", "arrow-back"],
    ["previous", "chevron-forward"],
    ["next", "chevron-back"],
    ["disclosure", "chevron-back"],
  ] as const)("resolves %s in RTL", (semantic, expected) => {
    expect(getDirectionalIcon(semantic, true)).toBe(expected);
  });
});
