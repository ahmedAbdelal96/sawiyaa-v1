import { PresenceStatus, type Prisma } from '@prisma/client';
import type { PrismaService } from '@common/prisma/prisma.service';
import type { PractitionerPresenceRepository } from '@modules/presence/repositories/practitioner-presence.repository';
import type { RevokeAuthSessionUseCase } from './revoke-auth-session.use-case';
import type { UserSessionRepository } from '../repositories/user-session.repository';
import { LogoutPractitionerUseCase } from './logout-practitioner.use-case';

describe('LogoutPractitionerUseCase', () => {
  const prisma = {
    $transaction: jest.fn(),
  } as jest.Mocked<Pick<PrismaService, '$transaction'>>;
  const userSessionRepository = {
    findActiveById: jest.fn(),
    countActiveByUserId: jest.fn(),
  } as jest.Mocked<
    Pick<UserSessionRepository, 'findActiveById' | 'countActiveByUserId'>
  >;
  const practitionerPresenceRepository = {
    updateStatus: jest.fn(),
  } as jest.Mocked<Pick<PractitionerPresenceRepository, 'updateStatus'>>;
  const revokeAuthSessionUseCase = {
    execute: jest.fn(),
  } as jest.Mocked<Pick<RevokeAuthSessionUseCase, 'execute'>>;

  const useCase = new LogoutPractitionerUseCase(
    prisma,
    userSessionRepository,
    practitionerPresenceRepository,
    revokeAuthSessionUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revokes the session and clears presence when it is the last active session', async () => {
    const tx = { id: 'tx-1' } as Prisma.TransactionClient;
    prisma.$transaction.mockImplementation((handler) =>
      typeof handler === 'function' ? handler(tx) : Promise.resolve([]),
    );
    userSessionRepository.findActiveById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      user: {
        practitionerProfile: {
          id: 'practitioner-1',
        },
      },
    });
    userSessionRepository.countActiveByUserId.mockResolvedValue(0);
    revokeAuthSessionUseCase.execute.mockResolvedValue(undefined);
    practitionerPresenceRepository.updateStatus.mockResolvedValue({});

    await useCase.execute('session-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(userSessionRepository.findActiveById).toHaveBeenCalledWith(
      'session-1',
      tx,
    );
    expect(revokeAuthSessionUseCase.execute).toHaveBeenCalledWith(
      'session-1',
      tx,
    );
    expect(userSessionRepository.countActiveByUserId).toHaveBeenCalledWith(
      'user-1',
      tx,
    );
    expect(practitionerPresenceRepository.updateStatus).toHaveBeenCalledWith(
      'practitioner-1',
      PresenceStatus.OFFLINE,
      tx,
    );
  });

  it('keeps presence unchanged when another active session still exists', async () => {
    const tx = { id: 'tx-2' } as Prisma.TransactionClient;
    prisma.$transaction.mockImplementation((handler) =>
      typeof handler === 'function' ? handler(tx) : Promise.resolve([]),
    );
    userSessionRepository.findActiveById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      user: {
        practitionerProfile: {
          id: 'practitioner-1',
        },
      },
    });
    userSessionRepository.countActiveByUserId.mockResolvedValue(1);
    revokeAuthSessionUseCase.execute.mockResolvedValue(undefined);

    await useCase.execute('session-1');

    expect(revokeAuthSessionUseCase.execute).toHaveBeenCalledWith(
      'session-1',
      tx,
    );
    expect(practitionerPresenceRepository.updateStatus).not.toHaveBeenCalled();
  });
});
