import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import { AcademyProgramSessionAttendanceRepository } from '../repositories/academy-program-session-attendance.repository';

@Injectable()
export class GetAdminAcademyProgramAttendanceUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramSessionAttendanceRepository: AcademyProgramSessionAttendanceRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
  ) {}

  async execute(input: {
    programId: string;
    locale: SupportedLocale;
    sessionId?: string | null;
  }) {
    const program = await this.academyProgramRepository.findProgramById(
      input.programId,
    );

    if (!program) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    const sessions = program.sessions ?? [];
    const selectedSession =
      (input.sessionId
        ? sessions.find((session) => session.id === input.sessionId)
        : null) ?? sessions[0] ?? null;

    const enrollments =
      await this.academyProgramEnrollmentRepository.listConfirmedEnrollmentsByProgramId(
        input.programId,
      );

    const attendanceRecords = selectedSession
      ? await this.academyProgramSessionAttendanceRepository.findAttendancesBySessionId(
          selectedSession.id,
        )
      : [];

    const attendanceByEnrollmentId = new Map(
      attendanceRecords.map((record) => [
        record.academyProgramEnrollmentId,
        record,
      ]),
    );

    const items = enrollments.map((enrollment) => {
      const record = attendanceByEnrollmentId.get(enrollment.id) ?? null;

      return {
        ...this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
          enrollment,
          input.locale,
        ),
        attendanceRecordId: record?.id ?? null,
        attendanceStatus: record?.attendanceStatus ?? 'UNMARKED',
        markedAt: record?.markedAt.toISOString() ?? null,
        markedByUserId: record?.markedByUserId ?? null,
      };
    });

    const markedPresent = items.filter(
      (item) => item.attendanceStatus === 'PRESENT',
    ).length;
    const markedAbsent = items.filter(
      (item) => item.attendanceStatus === 'ABSENT',
    ).length;
    const unmarked = items.length - markedPresent - markedAbsent;

    return {
      item: {
        program: this.academyProgramPresenter.presentAdminProgramDetails(program),
        sessions: sessions.map((session) =>
          this.academyProgramPresenter.presentAdminSessionItem(session),
        ),
        selectedSessionId: selectedSession?.id ?? null,
        selectedSession: selectedSession
          ? this.academyProgramPresenter.presentAdminSessionItem(selectedSession)
          : null,
        summary: {
          totalLearners: items.length,
          markedPresent,
          markedAbsent,
          unmarked,
          attendancePercentage: items.length
            ? Math.round((markedPresent / items.length) * 100)
            : 0,
        },
        items,
      },
    };
  }
}
