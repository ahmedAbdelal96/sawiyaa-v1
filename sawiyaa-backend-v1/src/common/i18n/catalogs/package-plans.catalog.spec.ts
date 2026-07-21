import { arCatalog } from './ar';
import { enCatalog } from './en';
import { I18nService } from '../services/i18n.service';

const errorKeys = [
  'practitionerNotEligible',
  'notFound',
  'inactivePlan',
  'invalidCode',
  'invalidSessionCount',
  'invalidDiscountPercent',
  'unsupportedCurrency',
  'currencyPriceUnavailable',
  'featureDisabled',
  'purchaseDisabled',
  'emptyUpdate',
  'emptySettingsUpdate',
  'settingsUnavailable',
] as const;

describe('package plan i18n catalog', () => {
  it.each(errorKeys)('contains the %s key in Arabic and English', (key) => {
    expect(arCatalog.packagePlans.errors[key]).toEqual(expect.any(String));
    expect(enCatalog.packagePlans.errors[key]).toEqual(expect.any(String));
  });

  it('resolves the not-found message without a missing-key warning', () => {
    const localeResolver = {
      getDefaultLocale: jest.fn().mockReturnValue('ar'),
    };
    const service = new I18nService(localeResolver as never);
    const warn = jest.spyOn((service as any).logger, 'warn');

    expect(service.t('packagePlans.errors.notFound', 'ar')).toBe(
      'لم يتم العثور على الباقة المطلوبة.',
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
