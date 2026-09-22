import { BadRequestException } from '@nestjs/common';
import { ManageAdminAcademyProgramEnrollmentsUseCase } from './manage-admin-academy-program-enrollments.use-case';

describe('ManageAdminAcademyProgramEnrollmentsUseCase', () => {
  function createUseCase(enrollment: Record<string, unknown>) {
    const updateEnrollment = jest.fn().mockResolvedValue({ ...enrollment, status: 'CONFIRMED' });
    const useCase = new ManageAdminAcademyProgramEnrollmentsUseCase(
      { $transaction: async (callback: (tx: unknown) => unknown) => callback('tx') } as any,
      { findEnrollmentByIdForAdmin: jest.fn().mockResolvedValue(enrollment), updateEnrollment } as any,
      { presentEnrollmentItem: jest.fn().mockReturnValue({}) } as any,
    );
    return { useCase, updateEnrollment };
  }

  it('exports the complete filtered dataset through the lean admin projection', async () => {
    const findAdminEnrollmentsForExport = jest.fn().mockResolvedValue([
      { id: 'enrollment-1' },
      { id: 'enrollment-2' },
    ]);
    const presentAdminEnrollmentListItem = jest.fn((item) => ({ id: item.id }));
    const useCase = new ManageAdminAcademyProgramEnrollmentsUseCase(
      {} as any,
      { findAdminEnrollmentsForExport } as any,
      { presentAdminEnrollmentListItem } as any,
    );

    const result = await useCase.exportEnrollments({
      academyProgramId: 'program-a',
      q: 'sara',
      country: 'EG',
      status: 'CONFIRMED',
      paymentStatus: 'CAPTURED',
      locale: 'en',
    } as any);

    expect(findAdminEnrollmentsForExport).toHaveBeenCalledWith({
      academyProgramId: 'program-a',
      q: 'sara',
      country: 'EG',
      status: 'CONFIRMED',
      paymentStatus: 'CAPTURED',
      sortBy: undefined,
      sortDir: undefined,
    });
    expect(presentAdminEnrollmentListItem).toHaveBeenCalledTimes(2);
    expect(result.items).toEqual([{ id: 'enrollment-1' }, { id: 'enrollment-2' }]);
  });

  it('does not fabricate attendance when marking completed', async () => {
    const { useCase, updateEnrollment } = createUseCase({ id: 'enrollment-1', confirmedAt: null, completedAt: null });

    await useCase.markCompleted({ enrollmentId: 'enrollment-1', locale: 'en' as any });

    expect(updateEnrollment).toHaveBeenCalledWith(
      'enrollment-1',
      expect.not.objectContaining({ attendanceSummarySnapshot: expect.anything() }),
      'tx',
    );
  });

  it('rejects legacy certification without an uploaded certificate file', async () => {
    const { useCase } = createUseCase({ id: 'enrollment-1', confirmedAt: null, completedAt: null, certificateFileStoragePath: null });

    await expect(useCase.markCertified({ enrollmentId: 'enrollment-1', locale: 'en' as any })).rejects.toBeInstanceOf(BadRequestException);
  });
});
