import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SecurityAuditOutcome } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { AdminPractitionerPublicationRepository } from '../repositories/admin-practitioner-publication.repository';

@Injectable()
export class ManagePractitionerPublicationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: AdminPractitionerPublicationRepository,
    private readonly visibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly audit: SecurityAuditService,
    private readonly i18n: I18nService,
  ) {}

  private evaluate(
    profile: NonNullable<
      Awaited<
        ReturnType<AdminPractitionerPublicationRepository['findPractitioner']>
      >
    >,
  ) {
    return this.visibilityPolicy.evaluate({
      practitionerStatus: profile.status,
      userStatus: profile.user.status,
      isPublicProfilePublished: profile.isPublicProfilePublished,
      hasPublicSlug: Boolean(profile.publicSlug?.trim()),
      hasDisplayName: Boolean(profile.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(profile.professionalTitle?.trim()),
      hasBio: Boolean(profile.bio?.trim()),
      hasAtLeastOneActiveSpecialty: profile.specialties.length > 0,
    });
  }

  private async view(
    profile: NonNullable<
      Awaited<
        ReturnType<AdminPractitionerPublicationRepository['findPractitioner']>
      >
    >,
  ) {
    const visibility = this.evaluate(profile);
    return {
      practitionerId: profile.id,
      displayName: profile.user.displayName,
      avatarUrl: profile.avatarUrl,
      practitionerStatus: profile.status,
      accountStatus: profile.user.status,
      isPublished: profile.isPublicProfilePublished,
      isReadyForPublication: visibility.blockers.length === 0,
      blockers: visibility.blockers,
      impact: await this.repository.getImpact(profile.id),
    };
  }

  async get(input: { practitionerId: string }) {
    const profile = await this.repository.findPractitioner(
      input.practitionerId,
    );
    if (!profile)
      throw new NotFoundException({
        messageKey: 'admin.practitionerPublication.errors.notFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    return this.view(profile);
  }

  async update(input: {
    practitionerId: string;
    actorUserId: string;
    locale: SupportedLocale;
    isPublished: boolean;
    reason?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
  }) {
    if (!input.isPublished && !input.reason?.trim()) {
      throw new BadRequestException({
        messageKey: 'admin.practitionerPublication.errors.reasonRequired',
        error: 'PRACTITIONER_UNPUBLICATION_REASON_REQUIRED',
      });
    }
    if (input.reason && input.reason.trim().length > 500) {
      throw new BadRequestException({
        messageKey: 'admin.practitionerPublication.errors.reasonTooLong',
        error: 'PRACTITIONER_UNPUBLICATION_REASON_TOO_LONG',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const profile = await this.repository.findPractitioner(
        input.practitionerId,
        tx,
      );
      if (!profile)
        throw new NotFoundException({
          messageKey: 'admin.practitionerPublication.errors.notFound',
          error: 'PRACTITIONER_PROFILE_NOT_FOUND',
        });
      const visibility = this.evaluate(profile);
      if (input.isPublished) {
        if (profile.isPublicProfilePublished)
          return {
            message: this.i18n.t(
              'admin.practitionerPublication.success.alreadyPublished',
              input.locale,
            ),
            publication: await this.view(profile),
          };
        if (visibility.blockers.length > 0)
          throw new ConflictException({
            messageKey: 'admin.practitionerPublication.errors.notReady',
            error: 'PRACTITIONER_PUBLICATION_NOT_READY',
            blockers: visibility.blockers,
          });
      } else if (!profile.isPublicProfilePublished) {
        return {
          message: this.i18n.t(
            'admin.practitionerPublication.success.alreadyUnpublished',
            input.locale,
          ),
          publication: await this.view(profile),
        };
      }

      const impact = await this.repository.getImpact(
        profile.id,
        new Date(),
        tx,
      );
      const updated = await this.repository.updatePublication(
        profile.id,
        input.isPublished,
        tx,
      );
      await this.audit.recordRequired(tx, {
        action: input.isPublished
          ? 'security.practitioner.publication.publish'
          : 'security.practitioner.publication.unpublish',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: input.actorUserId,
        resourceType: 'PractitionerProfile',
        resourceId: profile.id,
        targetUserId: profile.user.id,
        reason: input.isPublished ? undefined : input.reason?.trim(),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        requestId: input.requestId ?? null,
        correlationId: input.correlationId ?? null,
        metadata: {
          previousPublished: profile.isPublicProfilePublished,
          newPublished: updated.isPublicProfilePublished,
          readinessBlockerCount: visibility.blockers.length,
          activeUpcomingBookingCount: impact.activeUpcomingCount,
          nearestUpcomingAt: impact.nearestUpcomingAt,
        },
      });
      const refreshed = await this.repository.findPractitioner(profile.id, tx);
      if (!refreshed)
        throw new NotFoundException({
          messageKey: 'admin.practitionerPublication.errors.notFound',
          error: 'PRACTITIONER_PROFILE_NOT_FOUND',
        });
      return {
        message: this.i18n.t(
          input.isPublished
            ? 'admin.practitionerPublication.success.published'
            : 'admin.practitionerPublication.success.unpublished',
          input.locale,
        ),
        publication: { ...(await this.view(refreshed)), impact },
      };
    });
  }
}
