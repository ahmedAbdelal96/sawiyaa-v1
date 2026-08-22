import { BadRequestException } from '@nestjs/common';
import { SaveAdminAcademyProgramAttendanceUseCase } from './save-admin-academy-program-attendance.use-case';

describe('SaveAdminAcademyProgramAttendanceUseCase', () => {
  it('rejects a running or future session before any write transaction', async () => {
    const transaction = jest.fn();
    const useCase = new SaveAdminAcademyProgramAttendanceUseCase(
      { $transaction: transaction } as any,
      { findProgramById: jest.fn().mockResolvedValue({ sessions: [{ id: 'session-1', endsAt: new Date(Date.now() + 60_000) }] }) } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      useCase.execute({
        programId: 'program-1',
        locale: 'en' as any,
        actorUserId: 'admin-1',
        payload: { sessionId: 'session-1', items: [{ enrollmentId: 'enrollment-1', status: 'PRESENT' }] } as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
