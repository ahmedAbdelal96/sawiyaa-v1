import { getFirstRouteParam } from "../../src/lib/route-params";

describe("parameterized route safety", () => {
  it("normalizes scalar and array params without fabricating IDs", () => {
    expect(getFirstRouteParam("conversation-1")).toBe("conversation-1");
    expect(getFirstRouteParam(["conversation-1", "ignored"])).toBe("conversation-1");
    expect(getFirstRouteParam("  ")).toBeNull();
    expect(getFirstRouteParam([])).toBeNull();
    expect(getFirstRouteParam(undefined)).toBeNull();
  });
});
