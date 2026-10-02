import { ConflictException } from '@nestjs/common';
import { PaymentStatus, UserRoleType } from '@prisma/client';
import { ManageAdminAcademyEnrollmentAccountUseCase } from './manage-admin-academy-enrollment-account.use-case';

const patient = {
  id: 'patient-user',
  displayName: 'Patient User',
  roles: [{ role: UserRoleType.PATIENT }],
  emails: [{ email: 'patient@example.com' }],
};

function createFixture(options?: { canonical?: boolean; canonicalProgramIds?: string[]; sourceProgramIds?: string[] }) {
  const sourceLearner = { id: 'guest-learner', fullName: 'Guest Learner', userId: null };
  const canonicalLearner = options?.canonical ? { id: 'canonical-learner', userId: patient.id } : null;
  const sourceEnrollments = (options?.sourceProgramIds ?? ['program-b']).map((academyProgramId, index) => ({
    id: `source-enrollment-${index + 1}`,
    academyProgramId,
    userId: null,
  }));
  const canonicalEnrollments = (options?.canonicalProgramIds ?? ['program-a']).map((academyProgramId, index) => ({
    id: `canonical-enrollment-${index + 1}`,
    academyProgramId,
  }));
  const enrollment = {
    id: sourceEnrollments[0].id,
    academyLearnerId: sourceLearner.id,
    academyLearner: sourceLearner,
    userId: null,
    user: null,
    status: 'CONFIRMED',
    paymentStatus: PaymentStatus.CAPTURED,
  };
  const tx = {
    academyProgramEnrollment: {
      findUnique: jest.fn().mockResolvedValue(enrollment),
      findMany: jest.fn(({ where }: { where: { academyLearnerId: string } }) =>
        Promise.resolve(where.academyLearnerId === sourceLearner.id ? sourceEnrollments : canonicalEnrollments),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: sourceEnrollments.length }),
    },
    academyLearner: {
      findUnique: jest.fn().mockResolvedValue(canonicalLearner),
      update: jest.fn().mockResolvedValue({ ...sourceLearner, userId: patient.id }),
      delete: jest.fn().mockResolvedValue(sourceLearner),
    },
    userEmail: {
      findUnique: jest.fn().mockResolvedValue({ user: patient }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const useCase = new ManageAdminAcademyEnrollmentAccountUseCase(
    prisma as never,
    {} as never,
    { logAsync: jest.fn() } as never,
  );
  return { useCase, tx, sourceEnrollments };
}

const input = {
  enrollmentId: 'source-enrollment-1',
  email: ' PATIENT@EXAMPLE.COM ',
  confirm: true,
  actorUserId: 'admin-user',
};

describe('ManageAdminAcademyEnrollmentAccountUseCase.link', () => {
  it('links a guest learner when the Patient has no canonical AcademyLearner', async () => {
    const { useCase, tx } = createFixture({ canonical: false });

    await expect(useCase.link(input)).resolves.toMatchObject({ account: { type: 'PATIENT', email: 'patient@example.com' } });

    expect(tx.academyLearner.update).toHaveBeenCalledWith({ where: { id: 'guest-learner' }, data: { userId: 'patient-user' } });
    expect(tx.academyProgramEnrollment.updateMany).toHaveBeenCalledWith({
      where: { academyLearnerId: 'guest-learner' },
      data: { userId: 'patient-user' },
    });
  });

  it('consolidates multiple guest enrollments onto the existing canonical learner', async () => {
    const { useCase, tx, sourceEnrollments } = createFixture({ canonical: true, sourceProgramIds: ['program-b', 'program-c'] });

    await useCase.link(input);

    expect(tx.academyProgramEnrollment.updateMany).toHaveBeenCalledWith({
      where: { academyLearnerId: 'guest-learner' },
      data: { academyLearnerId: 'canonical-learner', userId: 'patient-user' },
    });
    expect(tx.academyProgramEnrollment.updateMany.mock.calls[0][0].data).toEqual({
      academyLearnerId: 'canonical-learner',
      userId: 'patient-user',
    });
    expect(sourceEnrollments).toHaveLength(2);
    expect(tx.academyLearner.delete).toHaveBeenCalledWith({ where: { id: 'guest-learner' } });
  });

  it('returns a controlled conflict for a duplicate same-program enrollment', async () => {
    const { useCase, tx } = createFixture({ canonical: true, canonicalProgramIds: ['program-b'] });

    await expect(useCase.link(input)).rejects.toMatchObject<Partial<ConflictException>>({
      response: expect.objectContaining({ error: 'ACADEMY_DUPLICATE_PROGRAM_ENROLLMENT_CONFLICT' }),
    });

    expect(tx.academyProgramEnrollment.updateMany).not.toHaveBeenCalled();
    expect(tx.academyLearner.delete).not.toHaveBeenCalled();
  });

  it('does not delete the guest learner when consolidation fails', async () => {
    const { useCase, tx } = createFixture({ canonical: true });
    tx.academyProgramEnrollment.updateMany.mockRejectedValueOnce(new Error('transaction failure'));

    await expect(useCase.link(input)).rejects.toThrow('transaction failure');

    expect(tx.academyLearner.delete).not.toHaveBeenCalled();
  });
});
