import {
  getPaymentDetailsRequest,
  getSessionFinancialBreakdownRequest,
  initiateSessionPaymentRequest,
  listPaymentsRequest,
  validateSessionCouponRequest,
} from "@/modules/payments/api/payments.api";

export const paymentsService = {
  async initiateSessionPayment(sessionId: string, couponCode?: string) {
    const response = await initiateSessionPaymentRequest(sessionId, {
      couponCode: couponCode?.trim() || undefined,
    });
    return response.item;
  },

  async listPayments(status?: string) {
    return listPaymentsRequest({
      status,
      page: 1,
      limit: 20,
    });
  },

  async getPayment(paymentId: string) {
    const response = await getPaymentDetailsRequest(paymentId);
    return response.item;
  },

  async validateCoupon(sessionId: string, couponCode: string) {
    const response = await validateSessionCouponRequest(sessionId, couponCode);
    return response.item;
  },

  async getFinancialBreakdown(sessionId: string, couponCode?: string) {
    const response = await getSessionFinancialBreakdownRequest(
      sessionId,
      couponCode?.trim() || undefined,
    );
    return response.item;
  },
};
