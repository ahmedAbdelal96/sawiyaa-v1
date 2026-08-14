import {
  operationalCanCancel,
  operationalJoinAllowed,
  operationalState,
} from "../../src/features/sessions/operational";

describe("session operational accessors", () => {
  test("deny actions when an older session payload lacks the join contract", () => {
    const session = { operational: {} };

    expect(operationalJoinAllowed(session)).toBe(false);
    expect(operationalCanCancel(session)).toBe(false);
    expect(operationalState(session)).toBeNull();
  });

  test("read complete operational values", () => {
    const session = {
      operational: {
        state: "READY_TO_JOIN",
        join: { allowed: true },
        actions: { canCancel: true },
      },
    };

    expect(operationalJoinAllowed(session)).toBe(true);
    expect(operationalCanCancel(session)).toBe(true);
    expect(operationalState(session)).toBe("READY_TO_JOIN");
  });
});
