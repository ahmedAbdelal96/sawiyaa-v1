import { BadRequestException } from '@nestjs/common';
import { PractitionerCurrencyLifecycleService } from './practitioner-currency-lifecycle.service';

function setup(input: { oldIso: string | null; newIso: string | null; balance?: string; openSettlements?: number }) {
  const tx = {
    practitionerProfile: { findUnique: jest.fn().mockResolvedValue({ country: input.oldIso ? { isoCode: input.oldIso } : null }) },
    country: { findUnique: jest.fn().mockResolvedValue(input.newIso ? { isoCode: input.newIso } : null) },
    practitionerWallet: { findFirst: jest.fn().mockResolvedValue(input.balance === undefined ? null : { id: 'wallet-old', availableBalance: input.balance, pendingBalance: '0', reservedBalance: '0' }) },
    practitionerSettlement: { count: jest.fn().mockResolvedValue(input.openSettlements ?? 0) },
  } as any;
  const walletRepository = { ensureActiveWallet: jest.fn().mockResolvedValue({ id: 'wallet-new' }) } as any;
  const audit = { recordRequired: jest.fn() } as any;
  return { service: new PractitionerCurrencyLifecycleService({} as any, walletRepository, audit), tx, walletRepository, audit };
}

describe('PractitionerCurrencyLifecycleService', () => {
  it('closes the old currency through the canonical wallet lifecycle and audits the transition', async () => {
    const { service, tx, walletRepository, audit } = setup({ oldIso: 'EG', newIso: 'US', balance: '0' });
    await expect(service.ensureForCountryChange({ practitionerId: 'p1', newCountryId: 'country-us', actorUserId: 'admin-1', tx })).resolves.toMatchObject({ changed: true, oldCurrency: 'EGP', newCurrency: 'USD' });
    expect(walletRepository.ensureActiveWallet).toHaveBeenCalledWith('p1', 'USD', tx);
    expect(audit.recordRequired).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'financial.practitioner.wallet.currency.changed' }));
  });

  it('blocks a country change while the old wallet has a balance', async () => {
    const { service, walletRepository } = setup({ oldIso: 'EG', newIso: 'US', balance: '5000' });
    const { tx } = setup({ oldIso: 'EG', newIso: 'US', balance: '5000' });
    await expect(service.ensureForCountryChange({ practitionerId: 'p1', newCountryId: 'country-us', actorUserId: 'admin-1', tx })).rejects.toBeInstanceOf(BadRequestException);
    expect(walletRepository.ensureActiveWallet).not.toHaveBeenCalled();
  });

  it('does nothing for a same-currency country change', async () => {
    const { service, walletRepository, audit } = setup({ oldIso: 'EG', newIso: 'EG' });
    const { tx } = setup({ oldIso: 'EG', newIso: 'EG' });
    await expect(service.ensureForCountryChange({ practitionerId: 'p1', newCountryId: 'country-eg', actorUserId: 'admin-1', tx })).resolves.toMatchObject({ changed: false, oldCurrency: 'EGP', newCurrency: 'EGP' });
    expect(walletRepository.ensureActiveWallet).not.toHaveBeenCalled();
    expect(audit.recordRequired).not.toHaveBeenCalled();
  });

  it('blocks a country change while settlements are not terminal', async () => {
    const { service, walletRepository } = setup({ oldIso: 'US', newIso: 'EG', balance: '0', openSettlements: 1 });
    const { tx } = setup({ oldIso: 'US', newIso: 'EG', balance: '0', openSettlements: 1 });
    await expect(service.ensureForCountryChange({ practitionerId: 'p1', newCountryId: 'country-eg', actorUserId: 'admin-1', tx })).rejects.toBeInstanceOf(BadRequestException);
    expect(walletRepository.ensureActiveWallet).not.toHaveBeenCalled();
  });
});
