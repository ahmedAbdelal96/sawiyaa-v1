import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionAccessPolicy } from '../policies/session-access.policy';
import { GetSessionDetailsUseCase } from './get-session-details.use-case';

describe('GetSessionDetailsUseCase — ownership', () => {
  const session = {
    id: 'session_1',
    patient: { id: 'patient_1' },
    practitioner: { id: 'prac_1' },
  };

  function buildUseCase(overrides?: {
    patientId?: string;
    practitionerId?: string;
  }) {
    const sessionRepository = {
      findById: jest.fn().mockResolvedValue(session),
      findLatestActiveSessionAdminDecisionsForSessions: jest.fn().mockResolvedValue(new Map()),
      findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue(null),
    };
    const sessionPatientRepository = {
      findByUserId: jest.fn().mockResolvedValue({
        id: overrides?.patientId ?? 'patient_1',
      }),
    };
    const sessionPractitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({
        id: overrides?.practitionerId ?? 'prac_1',
      }),
    };
    const sessionMapper = {
      toDetails: jest.fn().mockReturnValue({ id: session.id }),
    };

    const useCase = new GetSessionDetailsUseCase(
      sessionRepository as never,
      sessionPatientRepository as never,
      sessionPractitionerRepository as never,
      sessionMapper as never,
      new SessionAccessPolicy(),
    );

    return { useCase };
  }

  it('patient owner can retrieve session details', async () => {
    const { useCase } = buildUseCase({ patientId: 'patient_1' });
    await expect(
      useCase.execute({
        userId: 'user_1',
        locale: 'ar',
        sessionId: 'session_1',
        actorType: 'PATIENT',
      }),
    ).resolves.toMatchObject({ item: { id: 'session_1' } });
  });

  it('patient A cannot read patient B session (ForbiddenException)', async () => {
    const { useCase } = buildUseCase({ patientId: 'patient_2' });
    await expect(
      useCase.execute({
        userId: 'user_2',
        locale: 'ar',
        sessionId: 'session_1',
        actorType: 'PATIENT',
      }),
    ).rejects.toMatchObject({
      response: { error: 'SESSION_ACCESS_DENIED' },
    });
  });

  it('assigned practitioner can retrieve session details', async () => {
    const { useCase } = buildUseCase({ practitionerId: 'prac_1' });
    await expect(
      useCase.execute({
        userId: 'user_p',
        locale: 'ar',
        sessionId: 'session_1',
        actorType: 'PRACTITIONER',
      }),
    ).resolves.toMatchObject({ item: { id: 'session_1' } });
  });

  it('practitioner A cannot read practitioner B session (ForbiddenException)', async () => {
    const { useCase } = buildUseCase({ practitionerId: 'prac_2' });
    await expect(
      useCase.execute({
        userId: 'user_p2',
        locale: 'ar',
        sessionId: 'session_1',
        actorType: 'PRACTITIONER',
      }),
    ).rejects.toMatchObject({
      response: { error: 'SESSION_ACCESS_DENIED' },
    });
  });

  it('throws NotFoundException when session is not found', async () => {
    const { useCase } = (() => {
      const sessionRepository = {
        findById: jest.fn().mockResolvedValue(null),
        findLatestActiveSessionAdminDecisionsForSessions: jest.fn().mockResolvedValue(new Map()),
        findLatestActiveSessionAdminDecision: jest.fn().mockResolvedValue(null),
      };
      const uc = new GetSessionDetailsUseCase(
        sessionRepository as never,
        {} as never,
        {} as never,
        {} as never,
        new SessionAccessPolicy(),
      );
      return { useCase: uc };
    })();

    await expect(
      useCase.execute({
        userId: 'user_1',
        locale: 'ar',
        sessionId: 'nonexistent',
        actorType: 'PATIENT',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
