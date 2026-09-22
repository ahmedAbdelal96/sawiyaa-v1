import {
  formatMoney,
  formatSignedMoney,
  ledgerBucketTranslationKey,
  ledgerEntryTypeTranslationKey,
  safeFinanceText,
  settlementStatusTranslationKey,
} from "../../src/features/practitioner/finance/utils";

describe("Practitioner Finance presentation contracts", () => {
  test("delegates AR/EN currency output to the central money formatter", () => {
    expect(formatMoney("500.00", "EGP", "en-US")).toBe("EGP 500");
    expect(formatMoney("500.00", "EGP", "ar-SA")).toBe("500 جنيه مصري");
    expect(formatMoney("20.50", "USD", "en-US")).toBe("$20.50 USD");
  });

  test("does not silently aggregate or invent unsupported currencies", () => {
    expect(formatMoney("500", "EUR", "en-US", "Currency unavailable")).toBe(
      "Currency unavailable",
    );
    expect(formatSignedMoney("350", "EGP", "en-US")).toBe("+EGP 350");
    expect(formatSignedMoney("-1000", "EGP", "en-US")).toBe("-EGP 1,000");
  });

  test("maps finance concepts through localized translation keys", () => {
    expect(ledgerEntryTypeTranslationKey("PRACTITIONER_EARNING")).toBe(
      "practitioner.finance.ledger.entryTypes.PRACTITIONER_EARNING",
    );
    expect(ledgerBucketTranslationKey("PENDING")).toBe(
      "practitioner.finance.ledger.buckets.PENDING",
    );
    expect(settlementStatusTranslationKey("PROCESSING")).toBe(
      "practitioner.finance.settlements.statuses.PROCESSING",
    );
  });

  test("hides internal finance descriptions from normal UI", () => {
    expect(safeFinanceText("settlement_123", "Transfer")).toBe("Transfer");
    expect(safeFinanceText("Session earnings with Mona Hassan", "Transfer")).toBe(
      "Session earnings with Mona Hassan",
    );
  });
});
