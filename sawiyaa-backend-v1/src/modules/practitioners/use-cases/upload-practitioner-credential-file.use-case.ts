import { BadRequestException, ConflictException, Injectable, Optional } from '@nestjs/common';
import { CredentialType, SecurityAuditOutcome } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerCredentialMapper } from '../mappers/practitioner-credential.mapper';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerCredentialStorageService } from '../services/practitioner-credential-storage.service';
import { CreatePractitionerProfileUseCase } from './create-practitioner-profile.use-case';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';

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
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
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

    const profile = await this.createPractitionerProfileUseCase.execute(
      input.userId,
    );

    const stored = await this.practitionerCredentialStorageService.saveCredentialFile(
      {
        practitionerProfileId: profile.id,
        mimeType: input.file.mimetype,
        fileBuffer: input.file.buffer,
      },
    );

    const existing =
      await this.practitionerCredentialRepository.findExistingByTypeAndFileUrl({
        practitionerId: profile.id,
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
        practitionerId: profile.id,
        credentialType: input.credentialType,
        fileUrl: stored.fileUrl,
        expiresAt: input.expiresAt,
      };
      const credential = this.prisma && this.securityAuditService
        ? await this.prisma.$transaction(async (tx) => {
            const created = await this.practitionerCredentialRepository.create(data, tx);
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
        : await this.practitionerCredentialRepository.create(data);

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

