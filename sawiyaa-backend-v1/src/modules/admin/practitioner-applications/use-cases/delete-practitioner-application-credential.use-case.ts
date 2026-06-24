import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PractitionerApplicationStatus, Prisma } from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerApplicationSnapshotService } from '@modules/practitioners/services/practitioner-application-snapshot.service';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminPractitionerCredentialRepository } from '../repositories/admin-practitioner-credential.repository';
import { AdminSpecialtyRepository } from '../repositories/admin-specialty.repository';

@Injectable()
export class DeletePractitionerApplicationCredentialUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly credentialRepository: AdminPractitionerCredentialRepository,
    private readonly specialtyRepository: AdminSpecialtyRepository,
    private readonly practitionerApplicationSnapshotService: PractitionerApplicationSnapshotService,
  ) {}

  async execute(input: {
    applicationId: string;
    credentialId: string;
    locale: SupportedLocale;
    adminUserId: string;
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

    const now = new Date();
    const deletedCredentialId = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
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

        await this.credentialRepository.delete(existing.id, tx);

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

        return existing.id;
      },
    );

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationFetched',
        input.locale,
      ),
      deletedCredentialId,
    };
  }
}
