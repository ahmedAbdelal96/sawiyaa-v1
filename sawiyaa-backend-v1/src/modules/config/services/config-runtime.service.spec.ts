import { CONFIG_KEYS } from '../registry/config-key.constants';
import { ConfigRuntimeService } from './config-runtime.service';

describe('ConfigRuntimeService', () => {
  it('delegates typed reads to the existing resolver unchanged', async () => {
    const resolver = {
      resolveValue: jest.fn().mockResolvedValue({
        key: CONFIG_KEYS.packages.enabled,
        value: true,
        dataType: 'BOOLEAN',
      }),
      resolveByScope: jest.fn().mockResolvedValue({
        key: CONFIG_KEYS.packages.enabled,
        value: true,
        dataType: 'BOOLEAN',
      }),
      getRequiredString: jest.fn().mockResolvedValue('ar'),
      getBoolean: jest.fn().mockResolvedValue(true),
      getNumber: jest.fn().mockResolvedValue(15),
      getJson: jest.fn().mockResolvedValue(['EG']),
    };
    const service = new ConfigRuntimeService(resolver as never);
    const options = { at: new Date('2026-08-02T00:00:00.000Z') };

    await expect(
      service.resolveValue(CONFIG_KEYS.packages.enabled, options),
    ).resolves.toMatchObject({ value: true });
    await expect(
      service.resolveByScope(CONFIG_KEYS.packages.enabled, options),
    ).resolves.toMatchObject({ value: true });
    await expect(
      service.getBoolean(CONFIG_KEYS.packages.enabled, options),
    ).resolves.toBe(true);
    await expect(
      service.getString(CONFIG_KEYS.platform.defaultLocale, options),
    ).resolves.toBe('ar');
    await expect(
      service.getNumber(CONFIG_KEYS.auth.otp.loginTtlMinutes, options),
    ).resolves.toBe(15);
    await expect(
      service.getJson(
        CONFIG_KEYS.payment.provider.paymob.allowedCountries,
        options,
      ),
    ).resolves.toEqual(['EG']);

    expect(resolver.getBoolean).toHaveBeenCalledWith(
      CONFIG_KEYS.packages.enabled,
      options,
    );
    expect(resolver.getRequiredString).toHaveBeenCalledWith(
      CONFIG_KEYS.platform.defaultLocale,
      options,
    );
  });
});
