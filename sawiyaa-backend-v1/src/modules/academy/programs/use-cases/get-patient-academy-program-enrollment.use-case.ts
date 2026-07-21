import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademyProgramSessionAttendanceStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import { AcademyProgramSessionAttendanceRepository } from '../repositories/academy-program-session-attendance.repository';

@Injectable()
export class GetPatientAcademyProgramEnrollmentUseCase {
  constructor(
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramSessionAttendanceRepository: AcademyProgramSessionAttendanceRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
  ) {}

  async execute(input: {
    userId: string;
    enrollmentId: string;
    locale: SupportedLocale;
  }) {
    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForUser(
        input.enrollmentId,
        input.userId,
      );

    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    const program = await this.academyProgramRepository.findProgramById(
      enrollment.academyProgram.id,
    );

    if (!program) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    const attendanceRows =
      await this.academyProgramSessionAttendanceRepository.findAttendancesByEnrollmentId(
        enrollment.id,
      );

    const visibleSessions = (program.sessions ?? []).filter(
      (session) => session.isPublished,
    );
    const visibleSessionIds = new Set(visibleSessions.map((session) => session.id));
    const visibleAttendanceRows = attendanceRows.filter((row) =>
      visibleSessionIds.has(row.academyProgramSessionId),
    );
    const attendanceBySessionId = new Map(
      visibleAttendanceRows.map((row) => [row.academyProgramSessionId, row]),
    );
    const attendanceSessions = visibleAttendanceRows.length
      ? visibleSessions.map((session) => {
          const record = attendanceBySessionId.get(session.id) ?? null;

          return {
            ...this.academyProgramPresenter.presentPublicSessionItem(
              session,
              input.locale,
            ),
            attendanceRecordId: record?.id ?? null,
            attendanceStatus:
              record?.attendanceStatus ?? 'UNMARKED',
            markedAt: record?.markedAt?.toISOString() ?? null,
          };
        })
      : [];

    const attendanceSummarySnapshot = this.resolveAttendanceSummarySnapshot({
      totalSessions: visibleSessions.length,
      attendanceRows: visibleAttendanceRows,
      attendanceSummarySnapshot: enrollment.attendanceSummarySnapshot,
    });
    const programDetails = this.academyProgramPresenter.presentPublicProgramDetails(
      {
        ...program,
        sessions: visibleSessions,
      },
      input.locale,
      enrollment.selectedCurrencyCode === 'EGP' ? 'EG' : 'US',
    );
    const item = this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
      {
        ...enrollment,
        attendanceSummarySnapshot,
      },
      input.locale,
    );

    return {
      item: {
        ...item,
        program: programDetails,
      },
      attendance: {
        hasRecordedAttendance:
          Boolean(enrollment.attendanceSummarySnapshot) || visibleAttendanceRows.length > 0,
        summary: attendanceSummarySnapshot,
        sessions: attendanceSessions,
      },
    };
  }

  private resolveAttendanceSummarySnapshot(input: {
    totalSessions: number;
    attendanceRows: Array<{
      attendanceStatus: AcademyProgramSessionAttendanceStatus;
    }>;
    attendanceSummarySnapshot?: unknown;
  }) {
    const snapshot = this.normalizeAttendanceSummarySnapshot(
      input.attendanceSummarySnapshot,
      input.totalSessions,
    );

    if (snapshot) {
      return snapshot;
    }

    const attendedSessions = input.attendanceRows.filter(
      (row) => row.attendanceStatus === AcademyProgramSessionAttendanceStatus.PRESENT,
    ).length;
    const absentSessions = input.attendanceRows.filter(
      (row) => row.attendanceStatus === AcademyProgramSessionAttendanceStatus.ABSENT,
    ).length;
    const unmarkedSessions = Math.max(
      0,
      input.totalSessions - attendedSessions - absentSessions,
    );

    return {
      totalSessions: input.totalSessions,
      attendedSessions,
      absentSessions,
      unmarkedSessions,
      attendancePercentage: input.totalSessions
        ? Math.round((attendedSessions / input.totalSessions) * 100)
        : 0,
    };
  }

  private normalizeAttendanceSummarySnapshot(value: unknown, totalSessions: number) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const snapshot = value as {
      totalSessions?: unknown;
      attendedSessions?: unknown;
      absentSessions?: unknown;
      unmarkedSessions?: unknown;
      attendancePercentage?: unknown;
    };

    const total = Number(snapshot.totalSessions);
    const attended = Number(snapshot.attendedSessions);
    const absent = Number(snapshot.absentSessions);
    const percentage = Number(snapshot.attendancePercentage);
    const unmarkedRaw = Number(snapshot.unmarkedSessions);
    const unmarked =
      Number.isNaN(unmarkedRaw)
        ? Math.max(0, totalSessions - attended - absent)
        : unmarkedRaw;

    if (
      Number.isNaN(total) ||
      Number.isNaN(attended) ||
      Number.isNaN(absent) ||
      Number.isNaN(percentage)
    ) {
      return null;
    }

    return {
      totalSessions: total,
      attendedSessions: attended,
      absentSessions: absent,
      unmarkedSessions: unmarked,
      attendancePercentage: percentage,
    };
  }
}
