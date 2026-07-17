import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AcademyProgramSessionAttendanceStatus, SecurityAuditOutcome } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { SaveAdminAcademyProgramAttendanceDto } from '../dto/save-admin-academy-program-attendance.dto';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import { AcademyProgramSessionAttendanceRepository } from '../repositories/academy-program-session-attendance.repository';
import { GetAdminAcademyProgramAttendanceUseCase } from './get-admin-academy-program-attendance.use-case';

@Injectable()
export class SaveAdminAcademyProgramAttendanceUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramSessionAttendanceRepository: AcademyProgramSessionAttendanceRepository,
    private readonly getAdminAcademyProgramAttendanceUseCase: GetAdminAcademyProgramAttendanceUseCase,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    programId: string;
    locale: SupportedLocale;
    actorUserId: string;
    payload: SaveAdminAcademyProgramAttendanceDto;
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

    const selectedSession = (program.sessions ?? []).find(
      (session) => session.id === input.payload.sessionId,
    );

    if (!selectedSession) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.sessionNotFound',
        error: 'ACADEMY_PROGRAM_SESSION_NOT_FOUND',
      });
    }

    const confirmedEnrollments =
      await this.academyProgramEnrollmentRepository.listConfirmedEnrollmentsByProgramId(
        input.programId,
      );
    const confirmedEnrollmentIds = new Set(
      confirmedEnrollments.map((enrollment) => enrollment.id),
    );
    const beforeAttendance = await this.academyProgramSessionAttendanceRepository.findAttendancesBySessionId(
      selectedSession.id,
    );
    const beforeByEnrollment = new Map(
      beforeAttendance.map((row) => [row.academyProgramEnrollmentId, row.attendanceStatus]),
    );
    const hasCorrection = input.payload.items.some((item) => {
      const previous = beforeByEnrollment.get(item.enrollmentId);
      const next = item.status === 'UNMARKED' ? undefined : item.status;
      return previous !== undefined && previous !== next;
    });
    const correctionReason = input.payload.reason?.trim() || null;
    if (hasCorrection && !correctionReason) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.attendanceCorrectionReasonRequired',
        error: 'ACADEMY_PROGRAM_ATTENDANCE_CORRECTION_REASON_REQUIRED',
      });
    }

    const unknownEnrollmentId = input.payload.items.find(
      (item) => !confirmedEnrollmentIds.has(item.enrollmentId),
    )?.enrollmentId;

    if (unknownEnrollmentId) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of input.payload.items) {
        if (item.status === 'UNMARKED') {
          await this.academyProgramSessionAttendanceRepository.deleteAttendance(
            {
              sessionId: selectedSession.id,
              enrollmentId: item.enrollmentId,
            },
            tx,
          );
          continue;
        }

        if (
          item.status !== 'PRESENT' &&
          item.status !== 'ABSENT'
        ) {
          throw new BadRequestException({
            messageKey: 'academyProgram.errors.attendanceInvalidStatus',
            error: 'ACADEMY_PROGRAM_ATTENDANCE_INVALID_STATUS',
          });
        }

        await this.academyProgramSessionAttendanceRepository.upsertAttendance(
          {
            sessionId: selectedSession.id,
            enrollmentId: item.enrollmentId,
            status:
              item.status === 'PRESENT'
                ? AcademyProgramSessionAttendanceStatus.PRESENT
                : AcademyProgramSessionAttendanceStatus.ABSENT,
            markedByUserId: input.actorUserId,
          },
          tx,
        );
      }

      const updatedEnrollments =
        await this.academyProgramEnrollmentRepository.listConfirmedEnrollmentsByProgramId(
          input.programId,
          tx,
        );
      const attendanceRows =
        await this.academyProgramSessionAttendanceRepository.findAttendancesByProgramId(
          input.programId,
          tx,
        );

      const attendanceByEnrollment = new Map<
        string,
        Array<{ attendanceStatus: AcademyProgramSessionAttendanceStatus }>
      >();
      for (const row of attendanceRows) {
        const existing = attendanceByEnrollment.get(
          row.academyProgramEnrollmentId,
        ) ?? [];
        existing.push({ attendanceStatus: row.attendanceStatus });
        attendanceByEnrollment.set(row.academyProgramEnrollmentId, existing);
      }

      const totalSessions = program.sessions?.length ?? 0;
      for (const enrollment of updatedEnrollments) {
        const rows = attendanceByEnrollment.get(enrollment.id) ?? [];
        const presentCount = rows.filter(
          (row) => row.attendanceStatus === AcademyProgramSessionAttendanceStatus.PRESENT,
        ).length;
        const absentCount = rows.filter(
          (row) => row.attendanceStatus === AcademyProgramSessionAttendanceStatus.ABSENT,
        ).length;
        const summary = {
          totalSessions,
          attendedSessions: presentCount,
          absentSessions: absentCount,
          unmarkedSessions: Math.max(0, totalSessions - presentCount - absentCount),
          attendancePercentage: totalSessions
            ? Math.round((presentCount / totalSessions) * 100)
            : 0,
        };

        await this.academyProgramEnrollmentRepository.updateEnrollment(
          enrollment.id,
          {
            attendanceSummarySnapshot: summary,
          },
          tx,
        );
      }

      await this.securityAuditService?.recordRequired(tx, {
        action: hasCorrection
          ? 'academy.programAttendance.correct'
          : 'academy.programAttendance.update',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        source: SecurityAuditSource.HTTP_REQUEST,
        actorUserId: input.actorUserId,
        resourceType: 'AcademyProgramSessionAttendance',
        resourceId: selectedSession.id,
        metadata: {
          academyProgramId: input.programId,
          sessionId: selectedSession.id,
          markedCount: input.payload.items.filter((item) => item.status !== 'UNMARKED').length,
          totalItems: input.payload.items.length,
          correction: hasCorrection,
        },
        reason: hasCorrection ? correctionReason : null,
      });
    });

    return this.getAdminAcademyProgramAttendanceUseCase.execute({
      programId: input.programId,
      locale: input.locale,
      sessionId: input.payload.sessionId,
    });
  }
}
