import { ForbiddenException } from '@nestjs/common';
import { RegisterNotificationDeviceUseCase } from './register-notification-device.use-case';

describe('RegisterNotificationDeviceUseCase', () => {
  it('rejects roles not present on the authenticated user', async () => {
    const repository = {
      registerOrUpdate: jest.fn(),
    };

    const useCase = new RegisterNotificationDeviceUseCase(repository as never);

    await expect(
      useCase.execute({
        authenticatedUser: {
          id: 'user-1',
          roles: ['PATIENT' as never],
        },
        dto: {
          token: 'ExponentPushToken[test]',
          provider: 'EXPO',
          platform: 'IOS',
          role: 'PRACTITIONER',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
