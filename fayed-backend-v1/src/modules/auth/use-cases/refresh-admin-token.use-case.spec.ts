import { RefreshAuthSessionUseCase } from './refresh-auth-session.use-case';
import { RefreshAdminTokenUseCase } from './refresh-admin-token.use-case';

describe('RefreshAdminTokenUseCase', () => {
  it('accepts all internal admin-class roles for refresh', async () => {
    const refreshAuthSessionUseCase = {
      execute: jest.fn().mockResolvedValue({ tokens: {} }),
    } as unknown as RefreshAuthSessionUseCase;

    const useCase = new RefreshAdminTokenUseCase(refreshAuthSessionUseCase);

    await useCase.execute({
      refreshToken: 'refresh-token',
      deviceContext: {
        deviceId: 'device-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });

    expect((refreshAuthSessionUseCase as any).execute).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRoles: expect.arrayContaining([
          'ADMIN',
          'SUPER_ADMIN',
          'FINANCE_STAFF',
          'MARKETING_STAFF',
          'PRACTITIONER_REVIEWER',
          'PATIENT_OPERATIONS',
          'SUPPORT',
          'CONTENT_REVIEWER',
        ]),
      }),
    );
  });
});
