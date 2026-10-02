import { AcademyProgramSessionAttendanceRepository } from './academy-program-session-attendance.repository';

describe('AcademyProgramSessionAttendanceRepository', () => {
  it('upserts one canonical row per session and enrollment', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'attendance-1' });
    const repository = new AcademyProgramSessionAttendanceRepository({
      academyProgramSessionAttendance: { upsert },
    } as never);

    await repository.upsertAttendance({
      sessionId: 'session-1',
      enrollmentId: 'enrollment-1',
      status: 'PRESENT' as never,
      markedByUserId: 'admin-1',
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        academyProgramSessionId_academyProgramEnrollmentId: {
          academyProgramSessionId: 'session-1',
          academyProgramEnrollmentId: 'enrollment-1',
        },
      },
      update: expect.objectContaining({ attendanceStatus: 'PRESENT', markedByUserId: 'admin-1' }),
    }));
  });

  it('scopes reads and unmark deletes to the selected session/enrollment pair', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const repository = new AcademyProgramSessionAttendanceRepository({
      academyProgramSessionAttendance: { findMany, deleteMany },
    } as never);

    await repository.findAttendancesBySessionId('session-2');
    await repository.deleteAttendance({ sessionId: 'session-2', enrollmentId: 'enrollment-9' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { academyProgramSessionId: 'session-2' } }));
    expect(deleteMany).toHaveBeenCalledWith({ where: { academyProgramSessionId: 'session-2', academyProgramEnrollmentId: 'enrollment-9' } });
  });
});
