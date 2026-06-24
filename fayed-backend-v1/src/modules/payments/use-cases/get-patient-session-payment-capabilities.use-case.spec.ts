import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentProvider, Prisma } from '@prisma/client';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentSessionRepository } from '../repositories/payment-session.repository';
import { PaymentRuntimeConfigService } from '../services/payment-runtime-config.service';
import { ResolveSessionPaymentPricingService } from '../services/resolve-session-payment-pricing.service';
import { GetPatientSessionPaymentCapabilitiesUseCase } from './get-patient-session-payment-capabilities.use-case';

describe('GetPatientSessionPaymentCapabilitiesUseCase', () => {
  const paymentSessionRepository = {
    findPatientOwnedSession: jest.fn(),
  } as unknown as PaymentSessionRepository;
  const paymentRuntimeConfigService = {
    getPaymobEnabledMethods: jest.fn(),
    getPaymobDefaultCheckoutMethod: jest.fn(),
    getPaymobCheckoutFlow: jest.fn(),
  } as unknown as PaymentRuntimeConfigService;
  const resolveSessionPaymentPricingService = {
    resolve: jest.fn(),
  } as unknown as ResolveSessionPaymentPricingService;
  const customerWalletAccountingService = {
    getAvailableBalance: jest.fn(),
  } as unknown as CustomerWalletAccountingService;

  const useCase = new GetPatientSessionPaymentCapabilitiesUseCase(
    paymentSessionRepository,
    paymentRuntimeConfigService,
    resolveSessionPaymentPricingService,
    customerWalletAccountingService,
  );

  const baseSession = {
    id: 'session-1',
    patient: {
      id: 'patient-1',
      country: { isoCode: 'EGY' },
    },
    practitioner: {
      id: 'practitioner-1',
      country: { isoCode: 'EGY' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (
      paymentSessionRepository.findPatientOwnedSession as jest.Mock
    ).mockResolvedValue(baseSession);
    (
      paymentRuntimeConfigService.getPaymobEnabledMethods as jest.Mock
    ).mockReturnValue([
      { key: 'CARD', label: 'Card', type: 'CARD', enabled: true },
      { key: 'WALLET', label: 'Wallet', type: 'WALLET', enabled: true },
    ]);
    (
      paymentRuntimeConfigService.getPaymobDefaultCheckoutMethod as jest.Mock
    ).mockReturnValue('CARD');
    (
      paymentRuntimeConfigService.getPaymobCheckoutFlow as jest.Mock
    ).mockReturnValue('legacy');
    (
      resolveSessionPaymentPricingService.resolve as jest.Mock
    ).mockResolvedValue({
      currencyCode: 'EGP',
      provider: PaymentProvider.PAYMOB,
      regionalPricingMode: 'EGYPT_LOCAL',
      resolvedCountryIsoCode: 'EGY',
      amountTotal: '450.00',
    });
    (
      customerWalletAccountingService.getAvailableBalance as jest.Mock
    ).mockResolvedValue(new Prisma.Decimal('200.00'));
  });

  it('returns Paymob capabilities with configured CARD/WALLET methods only', async () => {
    const result = await useCase.execute({ userId: 'u1', sessionId: 's1' });

    expect(result.item.provider).toBe(PaymentProvider.PAYMOB);
    expect(result.item.supportedMethods).toEqual(['CARD', 'WALLET']);
    expect(result.item.normalizedMethods.map((m) => m.key)).toEqual([
      'CARD',
      'WALLET',
    ]);
    expect(result.item.normalizedMethods.some((m) => m.key === 'MEEZA')).toBe(
      false,
    );
    expect(result.item.normalizedMethods.some((m) => m.key === 'FAWRY')).toBe(
      false,
    );
  });

  it('returns card-only Paymob capability for USD routing', async () => {
    (
      resolveSessionPaymentPricingService.resolve as jest.Mock
    ).mockResolvedValueOnce({
      currencyCode: 'USD',
      provider: PaymentProvider.PAYMOB,
      regionalPricingMode: 'INTERNATIONAL',
      resolvedCountryIsoCode: 'USA',
      amountTotal: '45.00',
    });
    (
      paymentRuntimeConfigService.getPaymobEnabledMethods as jest.Mock
    ).mockReturnValueOnce([
      { key: 'CARD', label: 'Card', type: 'CARD', enabled: true },
    ]);
    (
      paymentRuntimeConfigService.getPaymobDefaultCheckoutMethod as jest.Mock
    ).mockReturnValueOnce('CARD');
    (
      paymentSessionRepository.findPatientOwnedSession as jest.Mock
    ).mockResolvedValueOnce({
      ...baseSession,
      patient: { id: 'patient-1', country: { isoCode: 'USA' } },
      practitioner: { id: 'practitioner-1', country: { isoCode: 'EGY' } },
    });

    const result = await useCase.execute({ userId: 'u1', sessionId: 's1' });
    expect(result.item.provider).toBe(PaymentProvider.PAYMOB);
    expect(result.item.supportedMethods).toEqual(['CARD']);
    expect(result.item.normalizedMethods.map((m) => m.key)).toEqual(['CARD']);
  });

  it('throws ambiguous routing when patient country is unknown', async () => {
    (
      paymentSessionRepository.findPatientOwnedSession as jest.Mock
    ).mockResolvedValueOnce({
      ...baseSession,
      patient: { id: 'patient-1', country: null },
    });

    await expect(
      useCase.execute({ userId: 'u1', sessionId: 's1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('wallet capability is disabled when no wallet balance is available', async () => {
    (
      customerWalletAccountingService.getAvailableBalance as jest.Mock
    ).mockResolvedValueOnce(new Prisma.Decimal('0.00'));

    const result = await useCase.execute({ userId: 'u1', sessionId: 's1' });
    expect(result.item.wallet.enabled).toBe(false);
    expect(result.item.wallet.canUseFullAmount).toBe(false);
    expect(result.item.wallet.canUsePartialAmount).toBe(false);
  });

  it('throws not found for non-owned session', async () => {
    (
      paymentSessionRepository.findPatientOwnedSession as jest.Mock
    ).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ userId: 'u1', sessionId: 's1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
