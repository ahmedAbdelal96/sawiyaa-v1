import { BadRequestException, ConflictException, Injectable, Optional } from '@nestjs/common';
import { CredentialLifecycleState, CredentialType, PractitionerStatus, ReviewSection, SecurityAuditOutcome } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerCredentialMapper } from '../mappers/practitioner-credential.mapper';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerCredentialStorageService } from '../services/practitioner-credential-storage.service';
import { CreatePractitionerProfileUseCase } from './create-practitioner-profile.use-case';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { PractitionerChangeReviewService } from '../services/practitioner-change-review.service';
import { PractitionerReviewCaseService } from '../services/practitioner-review-case.service';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';

type UploadedCredentialFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MAX_CREDENTIAL_FILE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadPractitionerCredentialFileUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly createPractitionerProfileUseCase: CreatePractitionerProfileUseCase,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerCredentialMapper: PractitionerCredentialMapper,
    private readonly practitionerCredentialStorageService: PractitionerCredentialStorageService,
    private readonly practitionerApplicationRepository: PractitionerApplicationRepository,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
    @Optional() private readonly changeReviewService?: PractitionerChangeReviewService,
    @Optional() private readonly reviewCaseService?: PractitionerReviewCaseService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    credentialType: CredentialType;
    expiresAt?: Date | null;
    file?: UploadedCredentialFile;
  }) {
    if (!input.file || !input.file.buffer || input.file.size <= 0) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.credentialFileRequired',
        error: 'PRACTITIONER_CREDENTIAL_FILE_REQUIRED',
      });
    }

    if (
      !this.practitionerCredentialStorageService.isAllowedMimeType(
        input.file.mimetype,
      )
    ) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.credentialInvalidType',
        error: 'PRACTITIONER_CREDENTIAL_INVALID_TYPE',
      });
    }

    if (input.file.size > MAX_CREDENTIAL_FILE_BYTES) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.credentialFileTooLarge',
        error: 'PRACTITIONER_CREDENTIAL_FILE_TOO_LARGE',
      });
    }

    const profile = await this.prisma?.practitionerProfile.findUnique({
      where: { userId: input.userId },
      select: { id: true, status: true },
    });
    const application = profile
      ? null
      : await this.practitionerApplicationRepository.findLatestByUserId(input.userId);
    if (!profile && !application) {
      throw new BadRequestException({ error: 'PRACTITIONER_APPLICATION_NOT_FOUND' });
    }

    if (input.credentialType !== CredentialType.OTHER) {
      const existingType =
        profile
          ? await this.practitionerCredentialRepository.findExistingByType({
              practitionerId: profile.id,
              credentialType: input.credentialType,
            })
          : await this.practitionerCredentialRepository.findExistingByTypeForApplication({
              applicationId: application!.id,
              credentialType: input.credentialType,
            });
      if (existingType && !(profile?.status === PractitionerStatus.APPROVED && existingType.reviewStatus === 'APPROVED')) {
        throw new ConflictException({
          messageKey: 'practitioners.errors.credentialAlreadyExists',
          error: 'PRACTITIONER_CREDENTIAL_TYPE_ALREADY_EXISTS',
        });
      }
    }

    const stored = await this.practitionerCredentialStorageService.saveCredentialFile(
      {
        ...(profile ? { practitionerProfileId: profile.id } : { applicationId: application!.id }),
        mimeType: input.file.mimetype,
        fileBuffer: input.file.buffer,
      },
    );

    const existing =
      profile
        ? await this.practitionerCredentialRepository.findExistingByTypeAndFileUrl({
            practitionerId: profile.id,
            credentialType: input.credentialType,
            fileUrl: stored.fileUrl,
          })
        : await this.practitionerCredentialRepository.findExistingByTypeAndFileUrlForApplication({
            applicationId: application!.id,
            credentialType: input.credentialType,
            fileUrl: stored.fileUrl,
          });

    if (existing) {
      await this.practitionerCredentialStorageService.deleteCredential(stored.fileUrl);
      throw new ConflictException({
        messageKey: 'practitioners.errors.credentialAlreadyExists',
        error: 'PRACTITIONER_CREDENTIAL_ALREADY_EXISTS',
      });
    }

    try {
      const data = {
        practitionerId: profile?.id,
        applicationId: application?.id,
        credentialType: input.credentialType,
        fileUrl: stored.fileUrl,
        storedFileId: stored.storedFileId ?? null,
        expiresAt: input.expiresAt,
        lifecycleState:
          profile?.status === PractitionerStatus.APPROVED
            ? CredentialLifecycleState.REPLACEMENT_PENDING
            : CredentialLifecycleState.ACTIVE,
      };
      const credential = this.prisma && this.securityAuditService
        ? await this.prisma.$transaction(async (tx) => {
            const created = await this.practitionerCredentialRepository.create(data, tx);
            if (profile) await this.changeReviewService?.upsert({ practitionerId: profile.id, tx });
            if (application) {
              const section = input.credentialType === CredentialType.NATIONAL_ID || input.credentialType === CredentialType.NATIONAL_ID_FRONT || input.credentialType === CredentialType.NATIONAL_ID_BACK
                ? ReviewSection.IDENTITY
                : input.credentialType === CredentialType.DEGREE
                  ? ReviewSection.ACADEMIC_CREDENTIALS
                  : ReviewSection.PROFESSIONAL_CREDENTIALS;
              await this.reviewCaseService?.markApplicationRequirementSubmitted({
                applicationId: application.id,
                section,
                credentialType: input.credentialType,
                tx,
              });
            }
            await this.securityAuditService!.recordRequired(tx, {
              action: 'security.practitioner.credential.upload',
              outcome: SecurityAuditOutcome.SUCCESS,
              actorType: SecurityAuditActorType.USER,
              source: SecurityAuditSource.HTTP_REQUEST,
              actorUserId: input.userId,
              targetUserId: input.userId,
              resourceType: 'PractitionerCredential',
              resourceId: created.id,
              metadata: { credentialType: created.credentialType, source: 'file' },
            });
            return created;
          })
        : await this.practitionerCredentialRepository.create(data).then(async (created) => {
            if (profile) await this.changeReviewService?.upsert({ practitionerId: profile.id });
            return created;
          });

      return {
        message: this.i18nService.t(
          'practitioners.success.credentialUploaded',
          input.locale,
        ),
        credential: this.practitionerCredentialMapper.toViewModel(credential),
      };
    } catch (error) {
      await this.practitionerCredentialStorageService.deleteCredential(stored.fileUrl);
      throw error;
    }
  }
}

