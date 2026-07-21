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
    paymentAlreadyCompleted:
      'A successful payment already exists for this session',
    activePaymentAlreadyExists:
      'An active payment attempt already exists for this session',
    pricingUnavailable: 'Session pricing is unavailable',
    currencyUnavailable: 'Payment currency is unavailable',
    invalidStatusTransition:
      'Payment status transition from {{from}} to {{to}} is invalid',
    providerNotFound: 'Payment provider {{provider}} was not found',
    providerNotConfigured: 'Payment provider {{provider}} is not configured',
    providerUnavailable:
      'Payment provider {{provider}} is currently unavailable',
    providerWebhookNotConfigured:
      'Webhook secret for payment provider {{provider}} is not configured',
    providerInitializationFailed:
      'Payment provider {{provider}} failed to initialize the payment',
    providerNotImplemented:
      'Payment provider {{provider}} is not implemented in this phase',
    invalidWebhookSignature: 'Payment webhook signature is invalid',
    unsupportedRoutingCombination:
      'No payment provider is available for {{currencyCode}} in {{market}} routing.',
    paymentRoutingAmbiguous:
      'More than one payment route is configured for this transaction. Please contact support.',
    paymentRoutingUnavailable:
      'No payment route is currently available for this transaction. Please contact support.',
    invalidReturnUrl: 'The payment return URL is invalid.',
    providerInitiationFailed: 'The payment provider could not start the payment.',
    invalidPaymentGatewayControl: 'Payment gateway control configuration is invalid.',
    paymentGatewayControlProviderUnsupported:
      'This payment provider is not supported by gateway control.',
    paymentGatewayControlReasonRequired:
      'A reason is required for this payment gateway control change.',
    paymentGatewayControlRevisionInvalid: 'The payment gateway control revision is invalid.',
    paymentGatewayControlRevisionNotFound:
      'The requested payment gateway control revision was not found.',
    paymentGatewayControlStepUpRequired:
      'Additional authorization is required for this payment gateway control change.',
    paymentForbidden: 'You are not allowed to access this payment.',
    invalidWebhookPayload: 'The payment webhook payload is invalid.',
    providerReferenceMissing: 'The payment provider reference is missing.',
    invalidRefundAmount: 'The refund amount is invalid.',
    paymentAlreadyFullyRefunded: 'This payment has already been fully refunded.',
    paymentNotRefundable: 'This payment cannot be refunded.',
    refundAlreadyInProgress: 'A refund is already in progress for this payment.',
    refundAmountExceedsRemaining:
      'The refund amount exceeds the remaining refundable amount.',
    refundNotRetryable: 'This refund cannot be retried.',
    originalMethodRefundNotAllowedForWalletSplit:
      'This wallet-split payment cannot be refunded to the original payment method.',
    patientRequiredForWalletRefund:
      'A patient is required before this refund can be credited to a wallet.',
    refundNotFound: 'The refund was not found.',
  },
};
