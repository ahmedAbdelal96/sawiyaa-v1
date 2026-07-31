import { ConfigService } from '@nestjs/config';
import { PractitionerOtpQaCaptureService } from './practitioner-otp-qa-capture.service';

describe('PractitionerOtpQaCaptureService', () => {
  function create(overrides: Record<string, unknown> = {}) {
    const values = {
      'app.nodeEnv': 'test',
      'auth.practitionerOtpQaCaptureEnabled': true,
      'auth.practitionerOtpQaCaptureAccounts': ['qa@example.test'],
      ...overrides,
    };
    return new PractitionerOtpQaCaptureService({
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService);
  }

  it('requires an explicit allowlist when enabled', () => {
    expect(() =>
      create({ 'auth.practitionerOtpQaCaptureAccounts': [] }),
    ).toThrow(/ACCOUNTS is required/);
  });

  it('is disabled in production even when the flag is set', () => {
    expect(() =>
      create({ 'app.nodeEnv': 'production' }),
    ).toThrow(/disabled in production/);
  });

  it('only captures allowlisted targets', () => {
    const service = create();
    expect(service.shouldCapture('qa@example.test')).toBe(true);
    expect(service.shouldCapture('other@example.test')).toBe(false);
  });
});
