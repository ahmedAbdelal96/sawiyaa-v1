export const enPaymentsCatalog = {
  notifications: {
    paymentSucceededTitle: 'Payment completed',
    paymentSucceededBody:
      'Your payment of {{amount}} {{currencyCode}} was completed successfully.',
    paymentFailedTitle: 'Payment failed',
    paymentFailedBody:
      'Your payment attempt failed. Please try again from your session checkout.',
    refundRequestedTitle: 'Refund requested',
    refundRequestedBody:
      'Your refund request for {{amount}} {{currencyCode}} has been received.',
    refundSucceededTitle: 'Refund completed',
    refundSucceededBody:
      'Your refund of {{amount}} {{currencyCode}} has been successfully processed.',
    refundFailedTitle: 'Refund failed',
    refundFailedBody:
      'Your refund request could not be processed right now. Support can help if needed.',
  },
  errors: {
    patientNotFound: 'Patient profile was not found',
    sessionNotFound: 'Session was not found',
    sessionNotPayable: 'Session is not currently payable',
    sessionPaymentExpired: 'Session payment window has expired',
    paymentNotFound: 'Payment was not found',
    paymentAlreadyCompleted: 'A successful payment already exists for this session',
    activePaymentAlreadyExists:
      'An active payment attempt already exists for this session',
    pricingUnavailable: 'Session pricing is unavailable',
    currencyUnavailable: 'Payment currency is unavailable',
    invalidStatusTransition:
      'Payment status transition from {{from}} to {{to}} is invalid',
    providerNotFound: 'Payment provider {{provider}} was not found',
    providerNotConfigured:
      'Payment provider {{provider}} is not configured',
    providerUnavailable:
      'Payment provider {{provider}} is currently unavailable',
    providerWebhookNotConfigured:
      'Webhook secret for payment provider {{provider}} is not configured',
    providerInitializationFailed:
      'Payment provider {{provider}} failed to initialize the payment',
    providerNotImplemented:
      'Payment provider {{provider}} is not implemented in this phase',
    invalidWebhookSignature: 'Payment webhook signature is invalid',
  },
};
