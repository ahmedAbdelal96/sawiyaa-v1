import { BadRequestException } from '@nestjs/common';
import {
  MarketType,
  PaymentProvider,
  Prisma,
  SessionMode,
} from '@prisma/client';
import { MoneyMathService } from '@modules/financial-rules/services/money-math.service';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { ValidatePackagePlanService } from './validate-package-plan.service';
import { PackageQuoteCalculatorService } from './package-quote-calculator.service';

describe('PackageQuoteCalculatorService', () => {
  const resolveCommissionRuleService = {
    resolveForSession: jest.fn(),
  } as never;
  const moneyMathService = new MoneyMathService();
  const validateSessionDurationService = new ValidateSessionDurationService();
  const validatePackagePlanService = new ValidatePackagePlanService();

  const service = new PackageQuoteCalculatorService(
    validateSessionDurationService,
    validatePackagePlanService,
    resolveCommissionRuleService,
    moneyMathService,
  );
  const calculateWithTrustedCountry = service.calculate.bind(service);
  service.calculate = ((input: any) =>
    calculateWithTrustedCountry({
      ...input,
      requestCountryIsoCode:
        input.requestCountryIsoCode === undefined
          ? 'EG'
          : input.requestCountryIsoCode,
    })) as typeof service.calculate;

  const practitioner = {
    id: 'practitioner-1',
    publicSlug: 'dr-youssef-abdallah',
    sessionPrice30Egp: new Prisma.Decimal('50.00'),
    sessionPrice30Usd: new Prisma.Decimal('20.00'),
    sessionPrice60Egp: new Prisma.Decimal('100.00'),
    sessionPrice60Usd: new Prisma.Decimal('40.00'),
    countryId: 'country-egy',
    country: {
      currencyCode: 'EGP',
    },
    specialties: [{ specialtyId: 'specialty-1', isPrimary: true }],
  };

  const patient = {
    id: 'patient-1',
    countryId: 'country-egy',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['SESSIONS_4', 4, '10.00'],
    ['SESSIONS_6', 6, '15.00'],
    ['SESSIONS_8', 8, '20.00'],
  ] as const)(
    'calculates %s with the right discount percent',
    async (code, count, discount) => {
      const result = await service.calculate({
        plan: {
          code,
          sessionCount: count,
          discountPercent: discount,
        },
        practitioner,
        selectedDurationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        patient: null,
        internalBreakdownVisible: false,
      });

      expect(result.discountPercent).toBe(discount);
      expect(result.sessionCount).toBe(count);
      expect(result.discountAmount).toBe(
        new Prisma.Decimal(100)
          .mul(count)
          .mul(new Prisma.Decimal(discount))
          .div(100)
          .toFixed(2),
      );
    },
  );

  it('uses EGP base session price when EGP is selected', async () => {
    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner,
      selectedDurationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient: null,
      internalBreakdownVisible: false,
    });

    expect(result.baseSessionPriceEgp).toBe('50.00');
    expect(result.baseSessionPriceUsd).toBe('20.00');
    expect(result.selectedBaseSessionPrice).toBe('50.00');
    expect(result.patientPayableTotal).toBe('180.00');
  });

  it('uses USD base session price when USD is selected', async () => {
    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner,
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      requestCountryIsoCode: 'US',
      selectedCurrencyCode: 'USD',
      patient: null,
      internalBreakdownVisible: false,
    });

    expect(result.baseSessionPriceUsd).toBe('40.00');
    expect(result.baseSessionPriceEgp).toBe('100.00');
    expect(result.selectedBaseSessionPrice).toBe('40.00');
    expect(result.patientPayableTotal).toBe('144.00');
  });

  it('defaults an unavailable request region to USD and ignores checkout/client currency', async () => {
    const result = await service.calculate({
      plan: { code: 'SESSIONS_4', sessionCount: 4, discountPercent: '10' },
      practitioner,
      selectedDurationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      requestCountryIsoCode: null,
      checkoutCountryIsoCode: 'EG',
      selectedCurrencyCode: 'EGP',
      patient: null,
      internalBreakdownVisible: false,
    });
    expect(result.selectedCurrencyCode).toBe('USD');
    expect(result.selectedBaseSessionPrice).toBe('20.00');
  });

  it('ignores client-selected currency in favor of the trusted request region', async () => {
    const foreignResult = await service.calculate({
      plan: { code: 'SESSIONS_4', sessionCount: 4, discountPercent: '10' },
      practitioner,
      selectedDurationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      requestCountryIsoCode: 'US',
      selectedCurrencyCode: 'EGP',
      patient: null,
      internalBreakdownVisible: false,
    });
    expect(foreignResult.selectedCurrencyCode).toBe('USD');

    const egyptResult = await service.calculate({
      plan: { code: 'SESSIONS_4', sessionCount: 4, discountPercent: '10' },
      practitioner,
      selectedDurationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      requestCountryIsoCode: 'EG',
      selectedCurrencyCode: 'USD',
      patient: null,
      internalBreakdownVisible: false,
    });
    expect(egyptResult.selectedCurrencyCode).toBe('EGP');
  });

  it('uses the explicit EGP price field instead of legacy session prices', async () => {
    const practitionerWithLegacyPrices = {
      ...practitioner,
      sessionPrice30: new Prisma.Decimal('999.00'),
      sessionPrice60: new Prisma.Decimal('999.00'),
    } as never;

    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner: practitionerWithLegacyPrices,
      selectedDurationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient: null,
      internalBreakdownVisible: false,
    });

    expect(result.selectedBaseSessionPrice).toBe('50.00');
    expect(result.baseSessionPriceEgp).toBe('50.00');
  });

  it('normalizes unsupported direct currency input through regional resolution', async () => {
    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner,
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      requestCountryIsoCode: 'US',
      selectedCurrencyCode: 'AED',
      patient: null,
      internalBreakdownVisible: false,
    });

    expect(result.selectedCurrencyCode).toBe('USD');
    expect(result.regionalPricingMode).toBe('INTERNATIONAL');
    expect(result.provider).toBe(PaymentProvider.PAYMOB);
  });

  it('rejects EGP quotes when the EGP price is missing', async () => {
    await expect(
      service.calculate({
        plan: {
          code: 'SESSIONS_4',
          sessionCount: 4,
          discountPercent: '10',
        },
        practitioner: {
          ...practitioner,
          sessionPrice30Egp: null,
          sessionPrice60Egp: null,
        },
        selectedDurationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        patient: null,
        internalBreakdownVisible: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects USD quotes when the USD price is missing', async () => {
    await expect(
      service.calculate({
        plan: {
          code: 'SESSIONS_4',
          sessionCount: 4,
          discountPercent: '10',
        },
        practitioner: {
          ...practitioner,
          sessionPrice30Usd: null,
          sessionPrice60Usd: null,
        },
        selectedDurationMinutes: 60,
        sessionMode: SessionMode.VIDEO,
        requestCountryIsoCode: 'US',
        selectedCurrencyCode: 'USD',
        patient: null,
        internalBreakdownVisible: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the local 70/30 commission split before discount', async () => {
    (
      resolveCommissionRuleService.resolveForSession as jest.Mock
    ).mockResolvedValue({
      rule: { marketType: MarketType.LOCAL },
      platformRatePercent: '30.00',
      practitionerRatePercent: '70.00',
    });

    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner,
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient,
      internalBreakdownVisible: true,
    });

    expect(result.commissionMode).toBe(MarketType.LOCAL);
    expect(result.platformOriginalShare).toBe('120.00');
    expect(result.practitionerOriginalShare).toBe('280.00');
  });

  it('uses the cross-border 50/50 commission split before discount', async () => {
    (
      resolveCommissionRuleService.resolveForSession as jest.Mock
    ).mockResolvedValue({
      rule: { marketType: MarketType.CROSS_BORDER },
      platformRatePercent: '50.00',
      practitionerRatePercent: '50.00',
    });

    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner,
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient,
      internalBreakdownVisible: true,
    });

    expect(result.commissionMode).toBe(MarketType.CROSS_BORDER);
    expect(result.platformOriginalShare).toBe('200.00');
    expect(result.practitionerOriginalShare).toBe('200.00');
  });

  it('splits the package discount equally between platform and practitioner', async () => {
    (
      resolveCommissionRuleService.resolveForSession as jest.Mock
    ).mockResolvedValue({
      rule: { marketType: MarketType.LOCAL },
      platformRatePercent: '30.00',
      practitionerRatePercent: '70.00',
    });

    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner,
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient,
      internalBreakdownVisible: true,
    });

    expect(result.platformDiscountShare).toBe(result.practitionerDiscountShare);
    expect(result.platformDiscountShare).toBe('20.00');
  });

  it('keeps final shares equal to the payable total', async () => {
    (
      resolveCommissionRuleService.resolveForSession as jest.Mock
    ).mockResolvedValue({
      rule: { marketType: MarketType.LOCAL },
      platformRatePercent: '30.00',
      practitionerRatePercent: '70.00',
    });

    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner: {
        ...practitioner,
        sessionPrice60Egp: new Prisma.Decimal('33.33'),
      },
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient,
      internalBreakdownVisible: true,
    });

    expect(
      new Prisma.Decimal(result.platformFinalShare ?? '0')
        .add(new Prisma.Decimal(result.practitionerFinalShare ?? '0'))
        .toFixed(2),
    ).toBe(result.patientPayableTotal);
  });

  it('applies deterministic rounding on non-even decimals', async () => {
    (
      resolveCommissionRuleService.resolveForSession as jest.Mock
    ).mockResolvedValue({
      rule: { marketType: MarketType.LOCAL },
      platformRatePercent: '30.00',
      practitionerRatePercent: '70.00',
    });

    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner: {
        ...practitioner,
        sessionPrice60Egp: new Prisma.Decimal('33.33'),
      },
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient,
      internalBreakdownVisible: true,
    });

    expect(result.discountAmount).toBe('13.33');
    expect(result.platformDiscountShare).toBe('6.67');
    expect(result.practitionerDiscountShare).toBe('6.66');
    expect(
      new Prisma.Decimal(result.platformFinalShare ?? '0')
        .add(new Prisma.Decimal(result.practitionerFinalShare ?? '0'))
        .toFixed(2),
    ).toBe(result.patientPayableTotal);
  });

  it('hides the internal breakdown when requested', async () => {
    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner,
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient: null,
      internalBreakdownVisible: false,
    });

    expect(result.platformDiscountShare).toBe('20.00');
    expect(result.platformOriginalShare).toBeNull();
    expect(result.practitionerFinalShare).toBeNull();
    expect(result.internalBreakdownVisible).toBe(false);
  });

  it('does not compute an internal split when patient country is missing', async () => {
    (
      resolveCommissionRuleService.resolveForSession as jest.Mock
    ).mockResolvedValue({
      rule: { marketType: MarketType.LOCAL },
      platformRatePercent: '30.00',
      practitionerRatePercent: '70.00',
    });

    const result = await service.calculate({
      plan: {
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: '10',
      },
      practitioner,
      selectedDurationMinutes: 60,
      sessionMode: SessionMode.VIDEO,
      selectedCurrencyCode: 'EGP',
      patient: null,
      internalBreakdownVisible: true,
    });

    expect(result.platformDiscountShare).toBe('20.00');
    expect(result.platformOriginalShare).toBeNull();
    expect(result.platformFinalShare).toBeNull();
    expect(result.commissionMode).toBeNull();
  });

  it('rejects unsupported durations', async () => {
    await expect(
      service.calculate({
        plan: {
          code: 'SESSIONS_4',
          sessionCount: 4,
          discountPercent: '10',
        },
        practitioner,
        selectedDurationMinutes: 45,
        sessionMode: SessionMode.VIDEO,
        selectedCurrencyCode: 'EGP',
        patient: null,
        internalBreakdownVisible: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
