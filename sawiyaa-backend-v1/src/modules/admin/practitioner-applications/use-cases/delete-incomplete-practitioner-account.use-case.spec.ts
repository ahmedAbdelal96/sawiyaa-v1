import { BadRequestException } from '@nestjs/common';
import { PractitionerStatus } from '@prisma/client';
import { DeleteIncompletePractitionerAccountUseCase } from './delete-incomplete-practitioner-account.use-case';

describe('DeleteIncompletePractitionerAccountUseCase', () => {
  const i18n = { t: jest.fn().mockReturnValue('deleted') };

  function createCase(profile: unknown, user: unknown) {
    const tx = {
      practitionerProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    return {
      useCase: new DeleteIncompletePractitionerAccountUseCase(prisma as never, i18n as never),
      tx,
    };
  }

  const emptyCount = {
    sessions: 0,
    payments: 0,
    wallets: 0,
    ledgerEntries: 0,
    settlements: 0,
    conversations: 0,
    supportTickets: 0,
    chatApprovalRequests: 0,
    instantBookingRequests: 0,
    sessionReviews: 0,
    patientViews: 0,
    reviewCases: 0,
    credentials: 0,
  };

  const profile = {
    userId: 'user-1',
    status: PractitionerStatus.DRAFT,
    isPublicProfilePublished: false,
    applications: [],
    _count: emptyCount,
  };

  const user = {
    id: 'user-1',
    practitionerApplications: [],
    patientProfile: null,
    _count: { auditEvents: 0, securityAuditLogs: 0 },
  };

  it('deletes only a clean incomplete account inside the transaction', async () => {
    const { useCase, tx } = createCase(profile, user);

    await expect(useCase.execute({ id: 'profile-1', locale: 'en' })).resolves.toEqual({ message: 'deleted' });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('refuses an account with a submitted application', async () => {
    const { useCase, tx } = createCase(profile, {
      ...user,
      practitionerApplications: [{ status: 'SUBMITTED', submittedAt: new Date() }],
    });

    await expect(useCase.execute({ id: 'profile-1', locale: 'en' })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it('refuses an account with financial history', async () => {
    const { useCase, tx } = createCase({ ...profile, _count: { ...emptyCount, payments: 1 } }, user);

    await expect(useCase.execute({ id: 'profile-1', locale: 'en' })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.delete).not.toHaveBeenCalled();
  });
});
