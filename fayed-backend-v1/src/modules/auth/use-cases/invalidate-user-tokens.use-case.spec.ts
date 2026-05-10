import { PresenceStatus, type Prisma } from '@prisma/client';
import type { PrismaService } from '@common/prisma/prisma.service';
import type { PractitionerPresenceRepository } from '@modules/presence/repositories/practitioner-presence.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { UserSessionRepository } from '../repositories/user-session.repository';
import { InvalidateUserTokensUseCase } from './invalidate-user-tokens.use-case';

describe('InvalidateUserTokensUseCase', () => {
  const prisma = {
    $transaction: jest.fn(),
  } as jest.Mocked<Pick<PrismaService, '$transaction'>>;
  const userRepository = {
    findByIdWithAuthContext: jest.fn(),
    incrementTokenVersion: jest.fn(),
  } as jest.Mocked<
    Pick<UserRepository, 'findByIdWithAuthContext' | 'incrementTokenVersion'>
  >;
  const userSessionRepository = {
    revokeAllActiveForUser: jest.fn(),
  } as jest.Mocked<Pick<UserSessionRepository, 'revokeAllActiveForUser'>>;
  const practitionerPresenceRepository = {
    updateStatus: jest.fn(),
  } as jest.Mocked<Pick<PractitionerPresenceRepository, 'updateStatus'>>;

  const useCase = new InvalidateUserTokensUseCase(
    prisma,
    userRepository,
    userSessionRepository,
    practitionerPresenceRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revokes all sessions and clears practitioner presence in the same transaction', async () => {
    const tx = { id: 'tx-1' } as Prisma.TransactionClient;
    prisma.$transaction.mockImplementation((handler) =>
      typeof handler === 'function' ? handler(tx) : Promise.resolve([]),
    );
    userRepository.findByIdWithAuthContext.mockResolvedValue({
      id: 'user-1',
      practitionerProfile: {
        id: 'practitioner-1',
      },
    });
    userRepository.incrementTokenVersion.mockResolvedValue({} as never);
    userSessionRepository.revokeAllActiveForUser.mockResolvedValue({
      count: 3,
    } as never);
    practitionerPresenceRepository.updateStatus.mockResolvedValue({} as never);

    await useCase.execute('user-1');

    expect(userRepository.findByIdWithAuthContext).toHaveBeenCalledWith(
      'user-1',
      tx,
    );
    expect(userRepository.incrementTokenVersion).toHaveBeenCalledWith(
      'user-1',
      tx,
    );
    expect(userSessionRepository.revokeAllActiveForUser).toHaveBeenCalledWith(
      'user-1',
      tx,
    );
    expect(practitionerPresenceRepository.updateStatus).toHaveBeenCalledWith(
      'practitioner-1',
      PresenceStatus.OFFLINE,
      tx,
    );
  });
});
