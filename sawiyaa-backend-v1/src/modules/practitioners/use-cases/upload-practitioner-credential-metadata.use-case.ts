import { ConflictException, Injectable, Optional } from '@nestjs/common';
import { CredentialType, SecurityAuditOutcome } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CreatePractitionerProfileUseCase } from './create-practitioner-profile.use-case';
import { PractitionerCredentialMapper } from '../mappers/practitioner-credential.mapper';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';

/**
 * Upload credential metadata stores baseline practitioner credential references.
 * This flow intentionally avoids file storage provider concerns in Phase 1.
 */
@Injectable()
export class UploadPractitionerCredentialMetadataUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly createPractitionerProfileUseCase: CreatePractitionerProfileUseCase,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerCredentialMapper: PractitionerCredentialMapper,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    credentialType: CredentialType;
    fileUrl: string;
    expiresAt?: Date | null;
  }) {
    const profile = await this.createPractitionerProfileUseCase.execute(
      input.userId,
    );

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
            metadata: { credentialType: created.credentialType, source: 'metadata' },
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
  }
}
