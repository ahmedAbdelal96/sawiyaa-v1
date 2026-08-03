import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { InitializeCurrentUserTimezoneUseCase } from './initialize-current-user-timezone.use-case';

describe('InitializeCurrentUserTimezoneUseCase', () => {
  const userRepository = {
    initializeTimezone: jest.fn(),
  } as unknown as UserRepository;
  const useCase = new InitializeCurrentUserTimezoneUseCase(userRepository);

  beforeEach(() => jest.clearAllMocks());

  it('persists a valid IANA timezone for a missing user timezone', async () => {
    userRepository.initializeTimezone = jest.fn().mockResolvedValue({
      user: { id: 'user-1', timezone: 'Asia/Riyadh' },
      initialized: true,
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user-1', roles: [] },
        timezone: ' Asia/Riyadh ',
      }),
    ).resolves.toEqual({ timezone: 'Asia/Riyadh', initialized: true });
    expect(userRepository.initializeTimezone).toHaveBeenCalledWith({
      userId: 'user-1',
      timezone: 'Asia/Riyadh',
    });
  });

  it('returns the existing value without overwriting it on a repeated request', async () => {
    userRepository.initializeTimezone = jest.fn().mockResolvedValue({
      user: { id: 'user-1', timezone: 'Africa/Cairo' },
      initialized: false,
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user-1', roles: [] },
        timezone: 'Asia/Riyadh',
      }),
    ).resolves.toEqual({ timezone: 'Africa/Cairo', initialized: false });
  });

  it.each(['UTC+2', '+02:00', 'Invalid/Timezone', ''])(
    'rejects non-IANA timezone %s',
    async (timezone) => {
      await expect(
        useCase.execute({
          authenticatedUser: { id: 'user-1', roles: [] },
          timezone,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userRepository.initializeTimezone).not.toHaveBeenCalled();
    },
  );

  it('reports a missing authenticated user record', async () => {
    userRepository.initializeTimezone = jest.fn().mockResolvedValue(null);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'missing', roles: [] },
        timezone: 'Africa/Cairo',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
