import { GetAdminAcademyProgramAttendanceUseCase } from './get-admin-academy-program-attendance.use-case';

describe('GetAdminAcademyProgramAttendanceUseCase', () => {
  it('projects attendance independently for the selected lecture and keeps unmarked distinct', async () => {
    const program = {
      id: 'program-1',
      sessions: [
        { id: 'session-1', startsAt: new Date('2026-09-01'), endsAt: new Date('2026-09-01') },
        { id: 'session-2', startsAt: new Date('2026-09-02'), endsAt: new Date('2026-09-02') },
      ],
    };
    const repository = {
      findProgramById: jest.fn().mockResolvedValue(program),
    };
    const enrollmentRepository = {
      listConfirmedEnrollmentsByProgramId: jest.fn().mockResolvedValue([
        { id: 'enrollment-1' },
        { id: 'enrollment-2' },
      ]),
    };
    const attendanceRepository = {
      findAttendancesBySessionId: jest.fn().mockImplementation(async (sessionId: string) =>
        sessionId === 'session-1'
          ? [{ id: 'attendance-1', academyProgramEnrollmentId: 'enrollment-1', attendanceStatus: 'PRESENT', markedAt: new Date(), markedByUserId: 'admin-1' }]
          : [{ id: 'attendance-2', academyProgramEnrollmentId: 'enrollment-1', attendanceStatus: 'ABSENT', markedAt: new Date(), markedByUserId: 'admin-2' }]),
    };
    const useCase = new GetAdminAcademyProgramAttendanceUseCase(
      repository as never,
      enrollmentRepository as never,
      attendanceRepository as never,
      { presentAdminProgramDetails: jest.fn().mockReturnValue({ id: 'program-1' }), presentAdminSessionItem: jest.fn((session) => session), presentPagination: jest.fn() } as never,
      { presentEnrollmentItem: jest.fn((enrollment) => ({ id: enrollment.id, learner: { fullName: enrollment.id } })) } as never,
    );

    const first = await useCase.execute({ programId: 'program-1', locale: 'en', sessionId: 'session-1' });
    const second = await useCase.execute({ programId: 'program-1', locale: 'en', sessionId: 'session-2' });

    expect(first.item.summary).toEqual(expect.objectContaining({ totalLearners: 2, markedPresent: 1, markedAbsent: 0, unmarked: 1 }));
    expect(first.item.items.map((item) => item.attendanceStatus)).toEqual(['PRESENT', 'UNMARKED']);
    expect(second.item.items.map((item) => item.attendanceStatus)).toEqual(['ABSENT', 'UNMARKED']);
  });
});
