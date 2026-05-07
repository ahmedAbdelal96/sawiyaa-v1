import { MarketType, PaymentProvider } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentGeoContextService } from './payment-geo-context.service';

describe('PaymentGeoContextService', () => {
  const prismaMock = {
    country: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new PaymentGeoContextService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves country from phone prefix and prefers existing account country', async () => {
    const findMany = prismaMock.country.findMany as jest.Mock;
    const findFirst = prismaMock.country.findFirst as jest.Mock;

    findMany.mockResolvedValue([
      { id: '1', isoCode: 'EGY', phoneCode: '+20' },
      { id: '2', isoCode: 'SAU', phoneCode: '+966' },
    ]);
    findFirst.mockImplementation(async (args: { where: { isoCode: string } }) =>
      args.where.isoCode === 'SAU'
        ? { id: '2', isoCode: 'SAU' }
        : null,
    );

    const result = await service.resolveCountryResolution({
      phoneNumber: '+966500000000',
      declaredCountryCode: 'EGY',
      existingCountryCode: 'SAU',
    });

    expect(result).toEqual({
      declaredCountryCode: 'EGY',
      resolvedCountryCode: 'SAU',
      countrySource: 'ACCOUNT',
      countryMismatch: true,
      phoneCountryCode: 'SAU',
    });
  });

  it('builds a stable country snapshot', () => {
    expect(
      service.buildCountrySnapshot({
        declaredCountryCode: 'EGY',
        resolvedCountryCode: 'EGY',
        countrySource: 'ACCOUNT',
        countryMismatch: false,
        phoneCountryCode: 'EGY',
        operatingCountryCode: 'EGY',
        checkoutCountryCode: 'EGY',
        pricingCurrencyCode: 'EGP',
        pricingMarketType: MarketType.LOCAL,
        provider: PaymentProvider.PAYMOB,
      }),
    ).toEqual({
      declaredCountryCode: 'EGY',
      resolvedCountryCode: 'EGY',
      countrySource: 'ACCOUNT',
      countryMismatch: false,
      phoneCountryCode: 'EGY',
      operatingCountryCode: 'EGY',
      checkoutCountryCode: 'EGY',
      pricingCurrencyCode: 'EGP',
      pricingMarketType: MarketType.LOCAL,
      provider: PaymentProvider.PAYMOB,
    });
  });
});
