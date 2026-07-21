import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  CredentialReviewStatus,
  CredentialType,
  PractitionerApplicationStatus,
  Prisma,
  SecurityAuditOutcome,
} from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerApplicationSnapshotService } from '@modules/practitioners/services/practitioner-application-snapshot.service';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerCredentialRepository } from '../repositories/admin-practitioner-credential.repository';
import { AdminSpecialtyRepository } from '../repositories/admin-specialty.repository';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditActorType, SecurityAuditSource } from '@common/security-audit/security-audit.types';

@Injectable()
export class UpsertPractitionerApplicationCredentialUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly credentialRepository: AdminPractitionerCredentialRepository,
    private readonly specialtyRepository: AdminSpecialtyRepository,
    private readonly practitionerApplicationSnapshotService: PractitionerApplicationSnapshotService,
    @Optional() private readonly securityAuditService?: SecurityAuditService,
  ) {}

  async execute(input: {
    applicationId: string;
    credentialId?: string;
    locale: SupportedLocale;
    adminUserId: string;
    data: {
      credentialType?: CredentialType;
      fileUrl?: string;
      reviewStatus?: CredentialReviewStatus;
      reviewNotes?: string | null;
      expiresAt?: string | null;
    };
  }) {
    const application = await this.applicationRepository.findById(
      input.applicationId,
    );
    if (!application) {
      throw new NotFoundException({
        messageKey: 'admin.practitionerApplications.errors.applicationNotFound',
        error: 'ADMIN_PRACTITIONER_APPLICATION_NOT_FOUND',
      });
    }

    if (
      application.status === PractitionerApplicationStatus.APPROVED ||
      application.status === PractitionerApplicationStatus.ARCHIVED
    ) {
      throw new ConflictException({
        messageKey:
          'admin.practitionerApplications.errors.invalidTransitionState',
        error: 'ADMIN_APPLICATION_LOCKED_FOR_EDIT',
      });
    }

    const expiresAt =
      input.data.expiresAt === undefined
        ? undefined
        : input.data.expiresAt === null || input.data.expiresAt.trim() === ''
          ? null
          : new Date(input.data.expiresAt);

    if (
      input.data.reviewStatus === CredentialReviewStatus.REJECTED &&
      !input.data.reviewNotes?.trim()
    ) {
      throw new BadRequestException({
        messageKey: 'admin.practitionerApplications.errors.credentialRejectionReasonRequired',
        error: 'ADMIN_CREDENTIAL_REJECTION_REASON_REQUIRED',
      });
    }

    if (expiresAt instanceof Date && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException({
        messageKey: 'validation.invalidDateString',
        error: 'ADMIN_INVALID_CREDENTIAL_EXPIRES_AT',
      });
    }

    const now = new Date();
    let previousReviewStatus: CredentialReviewStatus | null = null;
    let previousExpiresAt: string | null = null;
    const credential = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const normalizedReviewNotes =
          input.data.reviewNotes === undefined
            ? undefined
            : input.data.reviewNotes?.trim() || null;

        if (!input.credentialId) {
          if (!input.data.credentialType || !input.data.fileUrl?.trim()) {
            throw new BadRequestException({
              messageKey: 'validation.required',
              error: 'ADMIN_CREDENTIAL_CREATE_REQUIRED_FIELDS_MISSING',
            });
          }

          const createReviewStatus =
            input.data.reviewStatus ?? CredentialReviewStatus.PENDING;
          previousReviewStatus = null;
          previousExpiresAt = null;
          const isCreateReviewed = createReviewStatus !== 'PENDING';

          await this.credentialRepository.create(
            {
              practitionerId: application.practitionerId,
              credentialType: input.data.credentialType,
              fileUrl: input.data.fileUrl.trim(),
              reviewStatus: createReviewStatus,
              reviewedAt: isCreateReviewed ? now : null,
              reviewedByUserId: isCreateReviewed ? input.adminUserId : null,
              reviewNotes: normalizedReviewNotes,
              expiresAt: expiresAt === undefined ? null : expiresAt,
            },
            tx,
          );
        } else {
          const existing = await this.credentialRepository.findById(
            input.credentialId,
            tx,
          );
          if (
            !existing ||
            existing.practitionerId !== application.practitionerId
          ) {
            throw new NotFoundException({
              messageKey:
                'admin.practitionerApplications.errors.applicationNotFound',
              error: 'ADMIN_PRACTITIONER_CREDENTIAL_NOT_FOUND',
            });
          }

          previousReviewStatus = existing.reviewStatus;
          previousExpiresAt = existing.expiresAt?.toISOString() ?? null;

          const hasNoPatch =
            input.data.credentialType === undefined &&
            input.data.fileUrl === undefined &&
            input.data.reviewStatus === undefined &&
            input.data.reviewNotes === undefined &&
            input.data.expiresAt === undefined;

          if (hasNoPatch) {
            throw new BadRequestException({
              messageKey: 'validation.required',
              error: 'ADMIN_CREDENTIAL_UPDATE_EMPTY_PATCH',
            });
          }

          const nextReviewStatus =
            input.data.reviewStatus ?? existing.reviewStatus;
          const isReviewed = nextReviewStatus !== 'PENDING';

          await this.credentialRepository.update(
            existing.id,
            {
              credentialType: input.data.credentialType,
              fileUrl: input.data.fileUrl?.trim(),
              reviewStatus: nextReviewStatus,
              reviewedAt: isReviewed ? now : null,
              reviewedByUserId: isReviewed ? input.adminUserId : null,
              reviewNotes: normalizedReviewNotes,
              expiresAt:
                expiresAt === undefined ? existing.expiresAt : expiresAt,
            },
            tx,
          );
        }

        const [user, profile, specialtyLinks, credentials] = await Promise.all([
          tx.user.findUnique({
            where: { id: application.practitioner.userId },
            select: {
              displayName: true,
              defaultLocale: true,
              timezone: true,
            },
          }),
          tx.practitionerProfile.findUnique({
            where: { id: application.practitionerId },
            select: {
              practitionerType: true,
              practitionerGender: true,
              professionalTitle: true,
              bio: true,
              yearsOfExperience: true,
              country: { select: { isoCode: true } },
              primarySpecialtyCategoryId: true,
              payoutDestination: true,
              languages: {
                include: { language: { select: { code: true } } },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              },
            },
          }),
          tx.practitionerSpecialty.findMany({
            where: { practitionerId: application.practitionerId },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            select: {
              specialtyId: true,
              isPrimary: true,
            },
          }),
          tx.practitionerCredential.findMany({
            where: { practitionerId: application.practitionerId },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        if (!user || !profile) {
          throw new NotFoundException({
            messageKey:
              'admin.practitionerApplications.errors.applicationNotFound',
            error: 'ADMIN_PRACTITIONER_APPLICATION_INVALID_RELATION',
          });
        }

        const specialtyIds = specialtyLinks.map((item) => item.specialtyId);
        const specialties = await this.specialtyRepository.listByIds(
          specialtyIds,
          input.locale,
          tx,
        );
        const specialtyMap = new Map(
          specialties.map((item) => [item.id, item] as const),
        );

        const submissionSnapshot =
          this.practitionerApplicationSnapshotService.build({
            user: {
              displayName: user.displayName ?? null,
              defaultLocale: user.defaultLocale ?? null,
              timezone: user.timezone ?? null,
            },
            profile: {
              practitionerType: profile.practitionerType,
              practitionerGender: profile.practitionerGender ?? null,
              professionalTitle: profile.professionalTitle ?? null,
              bio: profile.bio ?? null,
              yearsOfExperience: profile.yearsOfExperience ?? null,
              countryCode: profile.country?.isoCode ?? null,
              primarySpecialtyCategoryId:
                profile.primarySpecialtyCategoryId ?? null,
            },
            languageCodes: profile.languages.map((item) => item.language.code),
            specialties: specialtyLinks.map((link) => {
              const specialty = specialtyMap.get(link.specialtyId);
              return {
                specialtyId: link.specialtyId,
                slug: specialty?.slug ?? '',
                title:
                  specialty?.translations.find((item) => item.locale === 'en')
                    ?.title ?? null,
                isPrimary: link.isPrimary,
                categoryId: specialty?.categoryId ?? null,
              };
            }),
            credentials: credentials.map((item) => ({
              credentialId: item.id,
              credentialType: item.credentialType,
              fileUrl: item.fileUrl,
              reviewStatus: item.reviewStatus,
              expiresAt: item.expiresAt,
              uploadedAt: item.createdAt,
              reviewedAt: item.reviewedAt ?? null,
              reviewedByUserId: item.reviewedByUserId ?? null,
              reviewNotes: item.reviewNotes ?? null,
            })),
            payoutDestination: profile.payoutDestination
                ? {
                  methodType: profile.payoutDestination.methodType,
                  countryCode: profile.payoutDestination.countryCode ?? null,
                  accountHolderName:
                    profile.payoutDestination.accountHolderName ?? null,
                  bankName: profile.payoutDestination.bankName ?? null,
                  bankAccountNumber:
                    profile.payoutDestination.bankAccountNumber ?? null,
                  iban: profile.payoutDestination.iban ?? null,
                  walletProvider:
                    profile.payoutDestination.walletProvider ?? null,
                  walletIdentifier:
                    profile.payoutDestination.walletIdentifier ?? null,
                  otherDetails: profile.payoutDestination.otherDetails ?? null,
                }
              : null,
          });

        await this.applicationRepository.updateSubmissionSnapshot(
          application.id,
          submissionSnapshot,
          tx,
        );

        const refreshedCredential =
          credentials.find((item) => item.id === input.credentialId) ??
          credentials[0];

        if (!refreshedCredential) {
          throw new NotFoundException({
            messageKey:
              'admin.practitionerApplications.errors.applicationNotFound',
            error: 'ADMIN_PRACTITIONER_CREDENTIAL_NOT_FOUND',
          });
        }

        await this.securityAuditService?.recordRequired(tx, {
          action: input.credentialId
            ? 'security.practitioner.credential.update'
            : 'security.practitioner.credential.create',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorType: SecurityAuditActorType.USER,
          source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.adminUserId,
          resourceType: 'PractitionerCredential',
          resourceId: refreshedCredential.id,
          targetUserId: application.practitioner.userId,
          reason: input.data.reviewNotes?.trim() || null,
          metadata: {
            applicationId: application.id,
            credentialType: refreshedCredential.credentialType,
            previousReviewStatus,
            reviewStatus: refreshedCredential.reviewStatus,
            ...(previousExpiresAt !== (refreshedCredential.expiresAt?.toISOString() ?? null)
              ? {
                  previousExpiresAt,
                  expiresAt: refreshedCredential.expiresAt?.toISOString() ?? null,
                }
              : {}),
          },
        });

        return refreshedCredential;
      },
    );

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationFetched',
        input.locale,
      ),
      credential: {
        credentialId: credential.id,
        credentialType: credential.credentialType,
        fileUrl: credential.fileUrl,
        reviewStatus: credential.reviewStatus,
        expiresAt: credential.expiresAt,
        uploadedAt: credential.createdAt,
        reviewedAt: credential.reviewedAt ?? null,
        reviewedByUserId: credential.reviewedByUserId ?? null,
        reviewNotes: credential.reviewNotes ?? null,
      },
    };
  }
}
