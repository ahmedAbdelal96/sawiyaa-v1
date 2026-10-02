import { describe, expect, it } from "vitest";
import {
  getPaymentExceptionStatusLabel,
  getPaymentExceptionTypeLabel,
  getPaymentProviderLabel,
} from "./AdminPaymentExceptionsScreen";

describe("Admin payment exception queue labels", () => {
  it("renders auto-detected anomaly labels in English and Arabic", () => {
    expect(getPaymentExceptionTypeLabel("LATE_PROVIDER_SUCCESS", "en")).toBe("Late provider success");
    expect(getPaymentExceptionTypeLabel("LATE_PROVIDER_SUCCESS", "ar")).toBe("نجاح متأخر من مزود الدفع");
    expect(getPaymentExceptionStatusLabel("OPEN", "en")).toBe("Needs review");
    expect(getPaymentExceptionStatusLabel("OPEN", "ar")).toBe("تحتاج مراجعة");
    expect(getPaymentProviderLabel("PAYMOB", "en")).toBe("Paymob");
    expect(getPaymentProviderLabel("PAYMOB", "ar")).toBe("باي موب");
  });
});
