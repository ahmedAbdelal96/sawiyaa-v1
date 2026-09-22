import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { AcademyProgramSessionAttendanceRepository } from '../repositories/academy-program-session-attendance.repository';

@Injectable()
export class GetAdminAcademyProgramEnrollmentUseCase {
  constructor(
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
    private readonly academyProgramSessionAttendanceRepository: AcademyProgramSessionAttendanceRepository,
  ) {}

  async execute(input: { enrollmentId: string; locale: SupportedLocale }) {
    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForAdmin(
        input.enrollmentId,
      );

    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    const attendance = await this.academyProgramSessionAttendanceRepository.findEnrollmentAttendanceTimeline(input.enrollmentId);
    return {
      item: {
        ...this.academyProgramEnrollmentPresenter.presentAdminEnrollmentDetail(
        enrollment,
        input.locale,
        ),
        attendance: attendance.map((record) => ({
          sessionId: record.academyProgramSession.id,
          title: { ar: record.academyProgramSession.titleAr, en: record.academyProgramSession.titleEn },
          startsAt: record.academyProgramSession.startsAt.toISOString(),
          endsAt: record.academyProgramSession.endsAt.toISOString(),
          status: record.attendanceStatus,
          markedAt: record.markedAt.toISOString(),
        })),
      },
    };
  }
}
