import { isAuthoritativePaymentCaptured } from "./payment-state-semantics";
import { describe, expect, it } from "vitest";

describe("payment state semantics", () => {
  it("treats CAPTURED as the only collected payment state", () => {
    expect(isAuthoritativePaymentCaptured("CAPTURED")).toBe(true);
    expect(isAuthoritativePaymentCaptured("AUTHORIZED")).toBe(false);
    expect(isAuthoritativePaymentCaptured("PENDING")).toBe(false);
    expect(isAuthoritativePaymentCaptured(null)).toBe(false);
  });
});
