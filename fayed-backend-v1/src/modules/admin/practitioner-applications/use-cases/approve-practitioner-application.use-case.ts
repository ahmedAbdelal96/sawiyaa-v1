import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PractitionerApplicationStatus,
  PractitionerStatus,
  Prisma,
} from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { PractitionerApplicationReviewPolicy } from '../policies/practitioner-application-review.policy';
import { PractitionerApplicationTransitionPolicy } from '../policies/practitioner-application-transition.policy';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerCredentialRepository } from '../repositories/admin-practitioner-credential.repository';
import { AdminPractitionerProfileRepository } from '../repositories/admin-practitioner-profile.repository';
import { AdminPractitionerSpecialtyRepository } from '../repositories/admin-practitioner-specialty.repository';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { AdminPractitionerApplicationNotificationService } from '../services/admin-practitioner-application-notification.service';

/**
 * Approves a practitioner application after transition-policy checks.
 * Reviewer identity is currently not persisted in dedicated schema fields; reviewedAt + notes are stored as baseline traceability.
 */
@Injectable()
export class ApprovePractitionerApplicationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly mapper: PractitionerApplicationsAdminMapper,
    private readonly reviewPolicy: PractitionerApplicationReviewPolicy,
    private readonly transitionPolicy: PractitionerApplicationTransitionPolicy,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly profileRepository: AdminPractitionerProfileRepository,
    private readonly practitionerSpecialtyRepository: AdminPractitionerSpecialtyRepository,
    private readonly credentialRepository: AdminPractitionerCredentialRepository,
    private readonly userRepository: AdminUserRepository,
    private readonly notificationService: AdminPractitionerApplicationNotificationService,
  ) {}

  async execute(input: {
    id: string;
    locale: SupportedLocale;
    adminUserId: string;
    reason?: string;
    note?: string;
  }) {
    const existing = await this.applicationRepository.findById(input.id);

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
      });
    }

    this.transitionPolicy.assertCanApprove(existing.status);

    const [profile, user, specialtyLinks, credentials] = await Promise.all([
      this.profileRepository.findById(existing.practitioner.id),
      this.userRepository.findApplicantSummary(existing.practitioner.userId),
      this.practitionerSpecialtyRepository.listByPractitionerId(
        existing.practitioner.id,
      ),
      this.credentialRepository.listByPractitionerId(existing.practitioner.id),
    ]);

    if (!profile || !user) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_INVALID_RELATION',
      });
    }

    const readiness = this.reviewPolicy.evaluateReadiness({
      hasDisplayName: Boolean(user.displayName?.trim()),
      hasProfessionalTitle: Boolean(profile.professionalTitle?.trim()),
      hasBio: Boolean(profile.bio?.trim()),
      hasCountry: Boolean(profile.country?.isoCode),
      hasYearsOfExperience:
        typeof profile.yearsOfExperience === 'number' &&
        profile.yearsOfExperience > 0,
      hasLanguage: profile.languages.length > 0,
      hasRequiredSpecialties: specialtyLinks.length > 0,
      hasRequiredCredentials: credentials.length > 0,
      hasPayoutDestination: Boolean(profile.payoutDestination),
      status: existing.status,
    });

    if (!readiness.canBeApproved) {
      throw new BadRequestException({
        messageKey:
          'admin.practitionerApplications.errors.invalidApplicationState',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_APPROVABLE',
      });
    }

    const reviewNotes = input.note?.trim() || null;
    const reviewDecisionReason = input.reason?.trim() || null;
    const reviewedAt = new Date();

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const latest = await this.applicationRepository.findById(input.id, tx);

        if (!latest) {
          throw new NotFoundException({
            messageKey:
              'admin.practitionerApplications.errors.applicationNotFound',
            error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
          });
        }

        this.transitionPolicy.assertCanApprove(latest.status);

        const decision = await this.applicationRepository.updateDecision(
          input.id,
          {
            status: PractitionerApplicationStatus.APPROVED,
            reviewedAt,
            reviewedByUserId: input.adminUserId,
            reviewDecisionReason,
            reviewNotes,
          },
          tx,
        );

        await this.profileRepository.updateStatus(
          decision.practitioner.id,
          PractitionerStatus.APPROVED,
          tx,
        );

        return decision;
      },
    );

    await this.notificationService.sendApproved({
      userId: updated.practitioner.userId,
      applicationId: updated.id,
      locale: input.locale,
    });

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationApproved',
        input.locale,
      ),
      application: this.mapper.toDecision({
        applicationId: updated.id,
        practitionerProfileId: updated.practitioner.id,
        userId: updated.practitioner.userId,
        status: updated.status,
        reviewedAt: updated.reviewedAt,
        reviewedByUserId: updated.reviewedByUserId ?? null,
        reviewDecisionReason: updated.reviewDecisionReason ?? null,
        reviewNotes: updated.reviewNotes ?? null,
      }),
    };
  }
}
