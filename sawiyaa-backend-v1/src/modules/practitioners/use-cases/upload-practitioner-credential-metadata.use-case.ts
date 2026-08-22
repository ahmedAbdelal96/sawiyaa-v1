import { BadRequestException, ConflictException, Injectable, Optional } from '@nestjs/common';
import { CredentialLifecycleState, CredentialType, PractitionerStatus, SecurityAuditOutcome } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerCredentialMapper } from '../mappers/practitioner-credential.mapper';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { PractitionerChangeReviewService } from '../services/practitioner-change-review.service';

/**
 * Upload credential metadata stores baseline practitioner credential references.
 * This flow intentionally avoids file storage provider concerns in Phase 1.
 */
@Injectable()
export class UploadPractitionerCredentialMetadataUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerCredentialMapper: PractitionerCredentialMapper,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
    @Optional() private readonly changeReviewService?: PractitionerChangeReviewService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    credentialType: CredentialType;
    fileUrl: string;
    expiresAt?: Date | null;
  }) {
    if (!input.fileUrl.trim().startsWith('/uploads/')) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.credentialFileUploadRequired',
        error: 'PRACTITIONER_CREDENTIAL_EXTERNAL_URL_NOT_ALLOWED',
      });
    }
    const profile = await this.practitionerProfileRepository.findByUserId(input.userId);
    if (!profile) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.applicationCredentialFileRequired',
        error: 'PRACTITIONER_APPLICATION_CREDENTIAL_FILE_REQUIRED',
      });
    }

    if (input.credentialType !== CredentialType.OTHER) {
      const existingType =
        await this.practitionerCredentialRepository.findExistingByType({
          practitionerId: profile.id,
          credentialType: input.credentialType,
        });
      if (existingType && !(profile.status === PractitionerStatus.APPROVED && existingType.reviewStatus === 'APPROVED')) {
        throw new ConflictException({
          messageKey: 'practitioners.errors.credentialAlreadyExists',
          error: 'PRACTITIONER_CREDENTIAL_TYPE_ALREADY_EXISTS',
        });
      }
    }

    const existing =
      await this.practitionerCredentialRepository.findExistingByTypeAndFileUrl({
        practitionerId: profile.id,
        credentialType: input.credentialType,
        fileUrl: input.fileUrl,
      });

    if (existing) {
      throw new ConflictException({
        messageKey: 'practitioners.errors.credentialAlreadyExists',
        error: 'PRACTITIONER_CREDENTIAL_ALREADY_EXISTS',
      });
    }

    const data = {
      practitionerId: profile.id,
      credentialType: input.credentialType,
      fileUrl: input.fileUrl,
      expiresAt: input.expiresAt,
      lifecycleState:
        profile.status === PractitionerStatus.APPROVED
          ? CredentialLifecycleState.REPLACEMENT_PENDING
          : CredentialLifecycleState.ACTIVE,
    };
    const credential = this.prisma && this.securityAuditService
      ? await this.prisma.$transaction(async (tx) => {
          const created = await this.practitionerCredentialRepository.create(data, tx);
          await this.changeReviewService?.upsert({ practitionerId: profile.id, tx });
          await this.securityAuditService!.recordRequired(tx, {
            action: 'security.practitioner.credential.upload',
            outcome: SecurityAuditOutcome.SUCCESS,
            actorType: SecurityAuditActorType.USER,
            source: SecurityAuditSource.HTTP_REQUEST,
            actorUserId: input.userId,
            targetUserId: input.userId,
            resourceType: 'PractitionerCredential',
            resourceId: created.id,
            metadata: { credentialType: created.credentialType, source: 'metadata' },
          });
          return created;
        })
      : await this.practitionerCredentialRepository.create(data).then(async (created) => {
          await this.changeReviewService?.upsert({ practitionerId: profile.id });
          return created;
        });

    return {
      message: this.i18nService.t(
        'practitioners.success.credentialUploaded',
        input.locale,
      ),
      credential: this.practitionerCredentialMapper.toViewModel(credential),
    };
  }
}
