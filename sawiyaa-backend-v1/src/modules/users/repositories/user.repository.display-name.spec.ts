import { UserRepository } from './user.repository';

describe('UserRepository patient display-name compatibility writes', () => {
  it('updates the profile canonical value and user mirror atomically for patients', async () => {
    const tx = {
      patientProfile: { upsert: jest.fn().mockResolvedValue({}) },
      user: {
        update: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', displayName: 'Ahmed A.' }),
      },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) },
      $transaction: jest.fn(async (callback: (client: unknown) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new UserRepository(prisma as never);

    await repository.patchCurrentUserProfile({
      userId: 'user-1',
      displayName: 'Ahmed A.',
      isPatient: true,
    });

    expect(tx.patientProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', displayName: 'Ahmed A.' },
      update: { displayName: 'Ahmed A.' },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { displayName: 'Ahmed A.' },
      select: { id: true, displayName: true },
    });
  });

  it('does not touch a patient profile for non-patient user edits', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', displayName: 'Admin' }),
      },
      $transaction: jest.fn(),
    };
    const repository = new UserRepository(prisma as never);

    await repository.patchCurrentUserProfile({
      userId: 'user-1',
      displayName: 'Admin',
      isPatient: false,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
