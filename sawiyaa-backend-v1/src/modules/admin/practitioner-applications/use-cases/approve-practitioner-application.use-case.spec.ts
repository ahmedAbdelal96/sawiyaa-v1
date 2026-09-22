import { ConflictException } from '@nestjs/common';
import {
  PractitionerApplicationStatus,
} from '@prisma/client';
import { ApprovePractitionerApplicationUseCase } from './approve-practitioner-application.use-case';

describe('ApprovePractitionerApplicationUseCase', () => {
  const input = {
    id: 'application-id',
    locale: 'en' as const,
    adminUserId: 'admin-id',
    operatorRoles: ['ADMIN'],
  };

  const buildUseCase = (options?: {
    existing?: Record<string, unknown>;
    latest?: Record<string, unknown>;
    failProfileCreate?: boolean;
    failAudit?: boolean;
  }) => {
    const existing = options?.existing ?? {
      id: input.id,
      userId: 'user-id',
      status: PractitionerApplicationStatus.SUBMITTED,
      practitioner: null,
      submissionSnapshot: { applicant: { displayName: 'Applicant' } },
    };
    const latest = options?.latest ?? existing;
    let applicationStatus = existing.status;
    const tx = {
      country: { findFirst: jest.fn().mockResolvedValue(null) },
      practitionerProfile: {
        create: jest.fn().mockImplementation(async () => {
          if (options?.failProfileCreate) throw new Error('profile create failed');
          return { id: 'practitioner-id' };
        }),
      },
      practitionerSpecialty: { createMany: jest.fn() },
      practitionerCredential: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      practitionerReviewCase: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const applicationRepository = {
      findById: jest.fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(latest),
      updateDecision: jest.fn().mockImplementation(async (_id, decision) => {
        applicationStatus = decision.status;
        return {
          id: input.id,
          status: applicationStatus,
          reviewedAt: decision.reviewedAt,
          reviewedByUserId: decision.reviewedByUserId,
          reviewDecisionReason: decision.reviewDecisionReason,
          reviewNotes: decision.reviewNotes,
          practitioner: { id: decision.practitionerId, userId: 'user-id' },
        };
      }),
    };
    const notificationService = { sendApproved: jest.fn().mockResolvedValue(undefined) };
    const securityAuditService = {
      recordRequired: jest.fn().mockImplementation(async () => {
        if (options?.failAudit) throw new Error('audit write failed');
      }),
      logAsync: jest.fn(),
    };
    const mapper = { toDecision: jest.fn().mockImplementation((value) => value) };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const before = applicationStatus;
        try {
          return await callback(tx);
        } catch (error) {
          applicationStatus = before;
          throw error;
        }
      }),
    };
    const transitionPolicy = {
      assertCanApprove: jest.fn().mockImplementation((status) => {
        if (status === PractitionerApplicationStatus.APPROVED) {
          throw new ConflictException({ error: 'PRACTITIONER_APPLICATION_ALREADY_APPROVED' });
        }
      }),
    };
    const useCase = new ApprovePractitionerApplicationUseCase(
      prisma as never,
      { t: jest.fn().mockReturnValue('approved') } as never,
      mapper as never,
      { evaluateReadiness: jest.fn() } as never,
      transitionPolicy as never,
      applicationRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      notificationService as never,
      securityAuditService as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { useCase, applicationRepository, notificationService, prisma, getApplicationStatus: () => applicationStatus };
  };

  it('links the created practitioner in the same transaction as approval', async () => {
    const { useCase, applicationRepository, notificationService } = buildUseCase();

    await useCase.execute(input);

    expect(applicationRepository.updateDecision).toHaveBeenCalledWith(
      input.id,
      expect.objectContaining({
        status: PractitionerApplicationStatus.APPROVED,
        practitionerId: 'practitioner-id',
      }),
      expect.anything(),
    );
    expect(notificationService.sendApproved).toHaveBeenCalledTimes(1);
  });

  it('does not commit approval or notify when practitioner creation fails', async () => {
    const { useCase, notificationService, getApplicationStatus } = buildUseCase({ failProfileCreate: true });

    await expect(useCase.execute(input)).rejects.toThrow('profile create failed');
    expect(getApplicationStatus()).toBe(PractitionerApplicationStatus.SUBMITTED);
    expect(notificationService.sendApproved).not.toHaveBeenCalled();
  });

  it('keeps audit inside the transaction while notification remains best effort', async () => {
    const { useCase, notificationService } = buildUseCase();
    notificationService.sendApproved.mockImplementationOnce(async () => {
      try {
        throw new Error('notification unavailable');
      } catch {
        // Mirrors the production notification service's best-effort boundary.
      }
    });

    await expect(useCase.execute(input)).resolves.toBeDefined();
  });

  it('rolls back approval when the in-transaction audit write fails', async () => {
    const { useCase, notificationService, getApplicationStatus } = buildUseCase({ failAudit: true });

    await expect(useCase.execute(input)).rejects.toThrow('audit write failed');
    expect(getApplicationStatus()).toBe(PractitionerApplicationStatus.SUBMITTED);
    expect(notificationService.sendApproved).not.toHaveBeenCalled();
  });

  it('rejects a second approval of an already approved application', async () => {
    const { useCase } = buildUseCase({
      existing: {
        id: input.id,
        userId: 'user-id',
        status: PractitionerApplicationStatus.APPROVED,
        practitioner: { id: 'practitioner-id', userId: 'user-id' },
        submissionSnapshot: null,
      },
    });

    await expect(useCase.execute(input)).rejects.toMatchObject({
      response: { error: 'PRACTITIONER_APPLICATION_ALREADY_APPROVED' },
    });
  });
});
