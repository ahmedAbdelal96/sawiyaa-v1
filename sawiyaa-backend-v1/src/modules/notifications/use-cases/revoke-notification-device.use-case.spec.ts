import { BadRequestException } from '@nestjs/common';
import { RevokeNotificationDeviceUseCase } from './revoke-notification-device.use-case';

describe('RevokeNotificationDeviceUseCase', () => {
  it('requires at least one selector', async () => {
    const repository = {
      revokeUserDevices: jest.fn(),
    };

    const useCase = new RevokeNotificationDeviceUseCase(repository as never);

    await expect(
      useCase.execute({
        authenticatedUser: {
          id: 'user-1',
          roles: ['PATIENT' as never],
        },
        dto: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
