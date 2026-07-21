import { BadRequestException } from '@nestjs/common';
import { PaymentPurpose, PaymentProvider, SessionFlowType, SessionMode } from '@prisma/client';
import { CouponRepository } from '../repositories/coupon.repository';
import { CalculateCouponDiscountService } from './calculate-coupon-discount.service';
import { CalculateSessionFinancialBreakdownService } from './calculate-session-financial-breakdown.service';
import { MoneyMathService } from './money-math.service';
import { ResolveCommissionRuleService } from './resolve-commission-rule.service';
import { ValidateCouponEligibilityService } from './validate-coupon-eligibility.service';

describe('CalculateSessionFinancialBreakdownService', () => {
  const couponRepository = {
    findByCode: jest.fn(),
  } as unknown as CouponRepository;
  const resolveCommissionRuleService = {
    resolveForSession: jest.fn(),
  } as unknown as ResolveCommissionRuleService;
  const validateCouponEligibilityService = {
    validateForSession: jest.fn(),
  } as unknown as ValidateCouponEligibilityService;
  const calculateCouponDiscountService = {
    calculate: jest.fn(),
  } as unknown as CalculateCouponDiscountService;
  const service = new CalculateSessionFinancialBreakdownService(
    couponRepository,
    resolveCommissionRuleService,
    validateCouponEligibilityService,
    calculateCouponDiscountService,
    new MoneyMathService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveCommissionRuleService.resolveForSession as jest.Mock).mockResolvedValue({
      rule: {
        id: 'rule-1',
        slug: 'default',
        platformRatePercent: '20.00',
        practitionerRatePercent: '80.00',
      },
      paymentPurpose: PaymentPurpose.SESSION_INSTANT_BOOKING,
      platformRatePercent: '20.00',
      practitionerRatePercent: '80.00',
    });
    (validateCouponEligibilityService.validateForSession as jest.Mock).mockResolvedValue(null);
    (calculateCouponDiscountService.calculate as jest.Mock).mockReturnValue({
      discountAmount: '0.00',
      platformDiscountShareAmount: '0.00',
      practitionerDiscountShareAmount: '0.00',
      platformSharePercent: '0.00',
      practitionerSharePercent: '0.00',
    });
  });

  const buildSessionWithPayment = (payment: {
    amountSubtotal: string;
    amountDiscount: string;
    amountTotal: string;
    currencyCode: string;
    provider: PaymentProvider;
  }) => ({
    id: 'session-payment-snapshot',
    flowType: SessionFlowType.SCHEDULED,
    sessionMode: SessionMode.VIDEO,
    durationMinutes: 30,
    practitioner: {
      id: 'practitioner-1',
      publicSlug: 'dr-youssef',
      sessionPrice30Egp: '500.00',
      sessionPrice30Usd: '20.00',
      countryId: 'country-egy',
      country: { isoCode: 'EGY', currencyCode: 'EGP' },
      specialties: [],
    },
    patient: {
      id: 'patient-1',
      countryId: 'country-egy',
      country: { isoCode: 'EGY' },
    },
    payments: [payment],
  });

  it('uses the frozen instant booking quote snapshot when available', async () => {
    const result = await service.calculate({
      requestCountryIsoCode: 'EG',
      session: {
        id: 'session-1',
        flowType: SessionFlowType.INSTANT,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-youssef',
          sessionPrice30: '300.00',
          sessionPrice60: '500.00',
          sessionPrice30Egp: '300.00',
          sessionPrice30Usd: '18.00',
          sessionPrice60Egp: '500.00',
          sessionPrice60Usd: '30.00',
          instantBookingPrice30Egp: '380.00',
          instantBookingPrice30Usd: '24.00',
          instantBookingPrice60Egp: '620.00',
          instantBookingPrice60Usd: '38.00',
          countryId: 'country-egy',
          country: {
            isoCode: 'EGY',
            currencyCode: 'EGP',
          },
          specialties: [],
        },
        patient: {
          id: 'patient-1',
          countryId: 'country-egy',
          country: {
            isoCode: 'EGY',
          },
        },
        instantBookingRequest: {
          metadataJson: {
            pricingSnapshot: {
              EGP: { 30: '555.00', 60: '777.00' },
              USD: { 30: '35.00', 60: '49.00' },
            },
          },
        },
      },
    });

    expect(result.amountSubtotal).toBe('555.00');
    expect(result.amountTotal).toBe('555.00');
  });

  it('falls back to instant practitioner pricing when no snapshot exists', async () => {
    const result = await service.calculate({
      requestCountryIsoCode: 'EG',
      session: {
        id: 'session-1',
        flowType: SessionFlowType.INSTANT,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-youssef',
          sessionPrice30: '300.00',
          sessionPrice60: '500.00',
          sessionPrice30Egp: '300.00',
          sessionPrice30Usd: '18.00',
          sessionPrice60Egp: '500.00',
          sessionPrice60Usd: '30.00',
          instantBookingPrice30Egp: '380.00',
          instantBookingPrice30Usd: '24.00',
          instantBookingPrice60Egp: '620.00',
          instantBookingPrice60Usd: '38.00',
          countryId: 'country-egy',
          country: {
            isoCode: 'EGY',
            currencyCode: 'EGP',
          },
          specialties: [],
        },
        patient: {
          id: 'patient-1',
          countryId: 'country-egy',
          country: {
            isoCode: 'EGY',
          },
        },
      },
    });

    expect(result.amountSubtotal).toBe('620.00');
    expect(result.amountTotal).toBe('620.00');
  });

  it('prefers the latest payment snapshot when the session already has an active payment', async () => {
    const result = await service.calculate({
      requestCountryIsoCode: 'EG',
      session: {
        id: 'session-1',
        flowType: SessionFlowType.INSTANT,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-youssef',
          sessionPrice30: '300.00',
          sessionPrice60: '500.00',
          sessionPrice30Egp: '300.00',
          sessionPrice30Usd: '18.00',
          sessionPrice60Egp: '500.00',
          sessionPrice60Usd: '30.00',
          instantBookingPrice30Egp: '380.00',
          instantBookingPrice30Usd: '24.00',
          instantBookingPrice60Egp: '620.00',
          instantBookingPrice60Usd: '38.00',
          countryId: 'country-egy',
          country: {
            isoCode: 'EGY',
            currencyCode: 'EGP',
          },
          specialties: [],
        },
        patient: {
          id: 'patient-1',
          countryId: 'country-egy',
          country: {
            isoCode: 'EGY',
          },
        },
        payments: [
          {
            amountSubtotal: '444.00',
            amountDiscount: '0.00',
            amountTotal: '444.00',
            currencyCode: 'EGP',
            provider: PaymentProvider.PAYMOB,
          },
        ],
        instantBookingRequest: {
          metadataJson: {
            pricingSnapshot: {
              EGP: { 30: '555.00' },
            },
          },
        },
      },
    });

    expect(result.amountSubtotal).toBe('444.00');
  });

  it('keeps an existing EGP payment snapshot when the current request is outside Egypt', async () => {
    const result = await service.calculate({
      requestCountryIsoCode: 'US',
      session: buildSessionWithPayment({
        amountSubtotal: '500.00',
        amountDiscount: '0.00',
        amountTotal: '500.00',
        currencyCode: 'EGP',
        provider: PaymentProvider.PAYMOB,
      }),
    });

    expect(result).toMatchObject({
      amountSubtotal: '500.00',
      amountTotal: '500.00',
      currencyCode: 'EGP',
      regionalPricingMode: 'EGYPT_LOCAL',
      provider: PaymentProvider.PAYMOB,
    });
  });

  it.each([
    ['EG', '20.00 USD'],
    [null, '20.00 USD'],
  ] as const)(
    'keeps an existing USD payment snapshot for request country %s',
    async (requestCountryIsoCode, expected) => {
      const result = await service.calculate({
        requestCountryIsoCode,
        session: buildSessionWithPayment({
          amountSubtotal: '20.00',
          amountDiscount: '0.00',
          amountTotal: '20.00',
          currencyCode: 'USD',
          provider: PaymentProvider.PAYMOB,
        }),
      });

      expect(`${result.amountSubtotal} ${result.currencyCode}`).toBe(expected);
      expect(result.regionalPricingMode).toBe('INTERNATIONAL');
    },
  );

  it.each([
    ['EG', 'EGP', '500.00'],
    ['EGY', 'EGP', '500.00'],
    ['US', 'USD', '20.00'],
    [null, 'USD', '20.00'],
  ] as const)(
    'uses new request-country pricing without a payment snapshot for %s',
    async (requestCountryIsoCode, expectedCurrency, expectedAmount) => {
      const session = buildSessionWithPayment({
        amountSubtotal: '999.00',
        amountDiscount: '0.00',
        amountTotal: '999.00',
        currencyCode: 'EGP',
        provider: PaymentProvider.PAYMOB,
      });
      const result = await service.calculate({
        requestCountryIsoCode,
        session: {
          ...session,
          payments: [],
        },
      });

      expect(result.currencyCode).toBe(expectedCurrency);
      expect(result.amountSubtotal).toBe(expectedAmount);
    },
  );

  it('fails safely for an unsupported persisted payment currency instead of repricing it', async () => {
    await expect(
      service.calculate({
        requestCountryIsoCode: 'EG',
        session: buildSessionWithPayment({
          amountSubtotal: '20.00',
          amountDiscount: '0.00',
          amountTotal: '20.00',
          currencyCode: 'EUR',
          provider: PaymentProvider.PAYMOB,
        }),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps the normal scheduled-session pricing path intact', async () => {
    const result = await service.calculate({
      requestCountryIsoCode: 'EG',
      session: {
        id: 'session-1',
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 30,
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-youssef',
          sessionPrice30: '300.00',
          sessionPrice60: '500.00',
          sessionPrice30Egp: '300.00',
          sessionPrice30Usd: '18.00',
          sessionPrice60Egp: '500.00',
          sessionPrice60Usd: '30.00',
          instantBookingPrice30Egp: '380.00',
          instantBookingPrice30Usd: '24.00',
          instantBookingPrice60Egp: '620.00',
          instantBookingPrice60Usd: '38.00',
          countryId: 'country-egy',
          country: {
            isoCode: 'EGY',
            currencyCode: 'EGP',
          },
          specialties: [],
        },
        patient: {
          id: 'patient-1',
          countryId: 'country-egy',
          country: {
            isoCode: 'EGY',
          },
        },
      },
    });

    expect(result.amountSubtotal).toBe('300.00');
    expect(result.paymentPurpose).toBe(PaymentPurpose.SESSION_INSTANT_BOOKING);
  });

  it('throws when no instant or scheduled pricing can be resolved', async () => {
    await expect(
      service.calculate({
        session: {
          id: 'session-1',
          flowType: SessionFlowType.INSTANT,
          sessionMode: SessionMode.VIDEO,
          durationMinutes: 30,
          practitioner: {
            id: 'practitioner-1',
            publicSlug: 'dr-youssef',
            sessionPrice30: null,
            sessionPrice60: null,
            sessionPrice30Egp: null,
            sessionPrice30Usd: null,
            sessionPrice60Egp: null,
            sessionPrice60Usd: null,
            instantBookingPrice30Egp: null,
            instantBookingPrice30Usd: null,
            instantBookingPrice60Egp: null,
            instantBookingPrice60Usd: null,
            countryId: 'country-egy',
            country: {
              isoCode: 'EGY',
              currencyCode: 'EGP',
            },
            specialties: [],
          },
          patient: {
            id: 'patient-1',
            countryId: 'country-egy',
            country: {
              isoCode: 'EGY',
            },
          },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
