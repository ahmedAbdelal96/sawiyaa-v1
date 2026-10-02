import { describe, expect, it } from "vitest";
import { resolveCheckoutFunding } from "./checkout-funding";

describe("server checkout funding", () => {
  const quote = { walletUsed: "123.45", gatewayAmount: "376.55", gatewayAmountWithoutWallet: "500.00", walletAvailable: "900.00", locked: false };
  it("displays the eligible server allocation even when wallet balance is higher", () => {
    expect(resolveCheckoutFunding(quote, true)).toEqual({ walletUsed: "123.45", gatewayRemaining: "376.55" });
  });
  it("selects the server gateway-only quote when wallet use is disabled", () => {
    expect(resolveCheckoutFunding(quote, false)).toEqual({ walletUsed: "0.00", gatewayRemaining: "500.00" });
  });
  it("preserves an existing payment allocation on a wallet-toggle retry", () => {
    expect(resolveCheckoutFunding({ ...quote, locked: true }, false)).toEqual({ walletUsed: "123.45", gatewayRemaining: "376.55" });
  });
  it("does not manufacture a zero payable amount when no quote is available", () => {
    expect(resolveCheckoutFunding(undefined, true)).toBeNull();
  });
});
