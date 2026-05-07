import { ServiceUnavailableException } from '@nestjs/common';
import { PackagePlanPolicyService } from './package-plan-policy.service';

describe('PackagePlanPolicyService', () => {
  const configResolverService = {
    getBoolean: jest.fn(),
  } as never;

  const service = new PackagePlanPolicyService(configResolverService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows package features when enabled', async () => {
    (configResolverService.getBoolean as jest.Mock).mockResolvedValue(true);

    await expect(service.assertPackagesEnabled()).resolves.toBeUndefined();
  });

  it('rejects package features when disabled', async () => {
    (configResolverService.getBoolean as jest.Mock).mockResolvedValue(false);

    await expect(service.assertPackagesEnabled()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('resolves a safe default preview currency', () => {
    expect(
      service.resolveDefaultPreviewCurrency({ practitionerCurrencyCode: 'usd' }),
    ).toBe('USD');
    expect(
      service.resolveDefaultPreviewCurrency({ practitionerCurrencyCode: 'aed' }),
    ).toBe('EGP');
  });
});
