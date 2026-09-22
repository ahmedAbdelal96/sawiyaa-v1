import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PractitionerApplicationStatus, PractitionerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';

const BLOCKED_APPLICATION_STATUSES = new Set<PractitionerApplicationStatus>([
  PractitionerApplicationStatus.SUBMITTED,
  PractitionerApplicationStatus.UNDER_REVIEW,
  PractitionerApplicationStatus.CHANGES_REQUESTED,
  PractitionerApplicationStatus.APPROVED,
  PractitionerApplicationStatus.REJECTED,
  PractitionerApplicationStatus.ARCHIVED,
]);

@Injectable()
export class DeleteIncompletePractitionerAccountUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
  ) {}

  async execute(input: { id: string; locale: SupportedLocale }) {
    await this.prisma.$transaction(async (tx) => {
      const profile = await tx.practitionerProfile.findUnique({
        where: { id: input.id },
        select: {
          userId: true,
          status: true,
          isPublicProfilePublished: true,
          applications: { select: { status: true, submittedAt: true } },
          _count: {
            select: {
              sessions: true,
              payments: true,
              wallets: true,
              ledgerEntries: true,
              settlements: true,
              conversations: true,
              supportTickets: true,
              chatApprovalRequests: true,
              instantBookingRequests: true,
              sessionReviews: true,
              patientViews: true,
              reviewCases: true,
              credentials: true,
            },
          },
        },
      });

      if (!profile) throw new NotFoundException('PRACTITIONER_NOT_FOUND');

      const user = await tx.user.findUnique({
        where: { id: profile.userId },
        select: {
          id: true,
          practitionerApplications: { select: { status: true, submittedAt: true } },
          patientProfile: { select: { id: true } },
          _count: { select: { auditEvents: true, securityAuditLogs: true } },
        },
      });

      if (!user) throw new NotFoundException('USER_NOT_FOUND');

      const hasSubmittedApplication = user.practitionerApplications.some(
        (application) =>
          application.submittedAt !== null || BLOCKED_APPLICATION_STATUSES.has(application.status),
      );
      const counts = profile._count;
      const hasProtectedDependencies =
        profile.status === PractitionerStatus.APPROVED ||
        profile.isPublicProfilePublished ||
        hasSubmittedApplication ||
        Boolean(user.patientProfile) ||
        user._count.auditEvents > 0 ||
        user._count.securityAuditLogs > 0 ||
        Object.values(counts).some((value) => value > 0);

      if (hasProtectedDependencies) {
        throw new BadRequestException({
          errorCode: 'PRACTITIONER_INCOMPLETE_ACCOUNT_DELETE_FORBIDDEN',
          messageKey: 'admin.practitioners.errors.deleteForbidden',
        });
      }

      await tx.user.delete({ where: { id: user.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return {
      message: this.i18nService.t(
        'admin.practitioners.success.incompleteAccountDeleted',
        input.locale,
      ),
    };
  }
}
