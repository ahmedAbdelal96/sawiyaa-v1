import { arCatalog } from './ar';
import { enCatalog } from './en';
import { I18nService } from '../services/i18n.service';

const usedPaymentErrorKeys = [
  'invalidPaymentGatewayControl', 'invalidRefundAmount', 'invalidReturnUrl',
  'invalidStatusTransition', 'invalidWebhookPayload', 'invalidWebhookSignature',
  'originalMethodRefundNotAllowedForWalletSplit', 'patientNotFound',
  'patientRequiredForWalletRefund', 'paymentAlreadyCompleted',
  'paymentAlreadyFullyRefunded', 'paymentForbidden',
  'paymentGatewayControlProviderUnsupported', 'paymentGatewayControlReasonRequired',
  'paymentGatewayControlRevisionInvalid', 'paymentGatewayControlRevisionNotFound',
  'paymentGatewayControlStepUpRequired', 'paymentNotFound', 'paymentNotRefundable',
  'paymentRoutingAmbiguous', 'providerInitializationFailed',
  'paymentRoutingUnavailable',
  'providerInitiationFailed', 'providerNotConfigured', 'providerNotFound',
  'providerReferenceMissing', 'providerUnavailable', 'providerWebhookNotConfigured',
  'refundAlreadyInProgress', 'refundAmountExceedsRemaining', 'refundNotFound',
  'refundNotRetryable', 'sessionNotFound', 'sessionNotPayable',
  'sessionPaymentExpired', 'unsupportedRoutingCombination',
] as const;

describe('payments i18n catalog', () => {
  it.each(usedPaymentErrorKeys)('contains %s in both locales', (key) => {
    expect(arCatalog.payments.errors[key]).toEqual(expect.any(String));
    expect(enCatalog.payments.errors[key]).toEqual(expect.any(String));
  });

  it('resolves ambiguous routing without returning the raw key or warning', () => {
    const service = new I18nService({
      getDefaultLocale: jest.fn().mockReturnValue('ar'),
    } as never);
    const warn = jest.spyOn((service as any).logger, 'warn');

    expect(service.t('payments.errors.paymentRoutingAmbiguous', 'en')).toBe(
      'More than one payment route is configured for this transaction. Please contact support.',
    );
    expect(service.t('payments.errors.paymentRoutingAmbiguous', 'ar')).toBe(
      'تعذر تحديد مسار الدفع المناسب بسبب وجود أكثر من إعداد متاح. يرجى التواصل مع الدعم.',
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
