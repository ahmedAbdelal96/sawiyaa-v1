import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AcademyProgramEnrollmentStatus, SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { ListAdminAcademyProgramEnrollmentsDto } from '../dto/list-admin-academy-program-enrollments.dto';
import { BulkAcademyProgramEnrollmentActionDto } from '../dto/bulk-academy-program-enrollment-action.dto';

type EnrollmentAction =
  | 'CANCEL_ENROLLMENT'
  | 'MARK_COMPLETED'
  | 'MARK_CERTIFIED';

@Injectable()
export class ManageAdminAcademyProgramEnrollmentsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async exportEnrollments(input: ListAdminAcademyProgramEnrollmentsDto & {
    academyProgramId: string;
    locale: SupportedLocale;
  }) {
    const items = await this.academyProgramEnrollmentRepository.findAdminEnrollmentsForExport({
      academyProgramId: input.academyProgramId,
      status: input.status,
      paymentStatus: input.paymentStatus,
      country: input.country,
      sortBy: input.sortBy,
      sortDir: input.sortDir,
      q: input.q,
    });

    return {
      items: items.map((item) =>
        this.academyProgramEnrollmentPresenter.presentEnrollmentItem(item, input.locale),
      ),
    };
  }

  async cancelEnrollment(input: {
    enrollmentId: string;
    locale: SupportedLocale;
    actorUserId?: string;
    actorRoles?: string[];
    reason?: string;
  }) {
    return this.updateOne(input.enrollmentId, 'CANCEL_ENROLLMENT', input.locale, input.actorUserId, input.actorRoles, input.reason);
  }

  async markCompleted(input: {
    enrollmentId: string;
    locale: SupportedLocale;
    actorUserId?: string;
    actorRoles?: string[];
  }) {
    return this.updateOne(input.enrollmentId, 'MARK_COMPLETED', input.locale, input.actorUserId, input.actorRoles);
  }

  async markCertified(input: {
    enrollmentId: string;
    locale: SupportedLocale;
    actorUserId?: string;
    actorRoles?: string[];
  }) {
    return this.updateOne(input.enrollmentId, 'MARK_CERTIFIED', input.locale, input.actorUserId, input.actorRoles);
  }

  async bulkAction(input: {
    academyProgramId: string;
    locale: SupportedLocale;
    actorUserId?: string;
    actorRoles?: string[];
    payload: BulkAcademyProgramEnrollmentActionDto;
  }) {
    const enrollmentIds = [...new Set(input.payload.enrollmentIds.map((id) => id.trim()).filter(Boolean))];

    if (enrollmentIds.length === 0) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.bulkEnrollmentIdsRequired',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_IDS_REQUIRED',
      });
    }

    if (input.payload.action === 'CANCEL_ENROLLMENT' && !input.payload.reason?.trim()) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.enrollmentCancellationReasonRequired',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_CANCELLATION_REASON_REQUIRED',
      });
    }

    const enrollments =
      await this.academyProgramEnrollmentRepository.findEnrollmentsByIdsForAdmin({
        academyProgramId: input.academyProgramId,
        enrollmentIds,
      });

    if (enrollments.length !== enrollmentIds.length) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const results: Array<
        Awaited<ReturnType<AcademyProgramEnrollmentRepository['updateEnrollment']>>
      > = [];
      for (const enrollment of enrollments) {
        const next = this.buildUpdate(input.payload.action, enrollment);
        const item = await this.academyProgramEnrollmentRepository.updateEnrollment(
          enrollment.id,
          next,
          tx,
        );
        results.push(item);
        await this.securityAuditService?.recordRequired(tx, {
          action: 'academy.programEnrollment.status.change',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: SecurityAuditActorType.USER,
          source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.actorUserId,
          actorRoles: input.actorRoles,
          resourceType: 'AcademyProgramEnrollment',
          resourceId: item.id,
          targetUserId: item.userId,
          metadata: {
            academyProgramId: input.academyProgramId,
            action: input.payload.action,
            previousStatus: enrollment.status,
            status: item.status,
          },
          reason: input.payload.reason?.trim() || null,
        });
      }
      return results;
    });

    return {
      items: updated.map((item) =>
        this.academyProgramEnrollmentPresenter.presentEnrollmentItem(item, input.locale),
      ),
    };
  }

  private async updateOne(
    enrollmentId: string,
    action: EnrollmentAction,
    locale: SupportedLocale,
    actorUserId?: string,
    actorRoles?: string[],
    reason?: string,
  ) {
    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForAdmin(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    if (action === 'CANCEL_ENROLLMENT' && !reason?.trim()) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.enrollmentCancellationReasonRequired',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_CANCELLATION_REASON_REQUIRED',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await this.academyProgramEnrollmentRepository.updateEnrollment(
        enrollment.id,
        this.buildUpdate(action, enrollment),
        tx,
      );
      await this.securityAuditService?.recordRequired(tx, {
        action: 'academy.programEnrollment.status.change',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        source: SecurityAuditSource.HTTP_REQUEST,
        actorUserId,
        actorRoles,
        resourceType: 'AcademyProgramEnrollment',
        resourceId: updated.id,
        targetUserId: updated.userId,
        metadata: {
          action,
          previousStatus: enrollment.status,
          status: updated.status,
        },
        reason: reason?.trim() || null,
      });
      return updated;
    });

    return {
      item: this.academyProgramEnrollmentPresenter.presentEnrollmentItem(updated, locale),
    };
  }

  private buildUpdate(
    action: EnrollmentAction,
    enrollment: NonNullable<
      Awaited<ReturnType<AcademyProgramEnrollmentRepository['findEnrollmentByIdForAdmin']>>
    >,
  ) {
    const now = new Date();
    const totalSessions = (enrollment.academyProgram as { _count?: { sessions?: number } })._count?.sessions ?? 0;
      const attendanceSummarySnapshot =
      enrollment.attendanceSummarySnapshot ??
      (action === 'MARK_COMPLETED' || action === 'MARK_CERTIFIED'
        ? {
            totalSessions,
            attendedSessions: totalSessions,
            absentSessions: 0,
            unmarkedSessions: 0,
            attendancePercentage: totalSessions > 0 ? 100 : 0,
          }
        : null);

    if (action === 'CANCEL_ENROLLMENT') {
      return {
        status: AcademyProgramEnrollmentStatus.CANCELLED,
        cancelledAt: now,
      };
    }

    if (action === 'MARK_COMPLETED') {
      return {
        status: AcademyProgramEnrollmentStatus.CONFIRMED,
        confirmedAt: enrollment.confirmedAt ?? now,
        completedAt: enrollment.completedAt ?? now,
        ...(attendanceSummarySnapshot ? { attendanceSummarySnapshot } : {}),
      };
    }

    return {
      status: AcademyProgramEnrollmentStatus.CONFIRMED,
      confirmedAt: enrollment.confirmedAt ?? now,
      completedAt: enrollment.completedAt ?? now,
      certificateIssuedAt: enrollment.certificateIssuedAt ?? now,
      ...(attendanceSummarySnapshot ? { attendanceSummarySnapshot } : {}),
    };
  }
}
