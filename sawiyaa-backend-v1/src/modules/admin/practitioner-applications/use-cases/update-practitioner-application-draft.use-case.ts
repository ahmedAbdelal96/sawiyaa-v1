import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PractitionerApplicationStatus,
  PractitionerPayoutMethodType,
  PractitionerType,
  Prisma,
} from '@prisma/client';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerApplicationSnapshotService } from '@modules/practitioners/services/practitioner-application-snapshot.service';
import { PractitionerPayoutDestinationValidationService } from '@modules/practitioners/services/practitioner-payout-destination-validation.service';
import { PractitionerSpecialtyIntegrityService } from '@modules/practitioners/services/practitioner-specialty-integrity.service';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { AdminPractitionerApplicationRepository } from '../repositories/admin-practitioner-application.repository';
import { AdminSpecialtyRepository } from '../repositories/admin-specialty.repository';

@Injectable()
export class UpdatePractitionerApplicationDraftUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly mapper: PractitionerApplicationsAdminMapper,
    private readonly applicationRepository: AdminPractitionerApplicationRepository,
    private readonly specialtyRepository: AdminSpecialtyRepository,
    private readonly practitionerSpecialtyIntegrityService: PractitionerSpecialtyIntegrityService,
    private readonly practitionerPayoutDestinationValidationService: PractitionerPayoutDestinationValidationService,
    private readonly practitionerApplicationSnapshotService: PractitionerApplicationSnapshotService,
  ) {}

  async execute(input: {
    id: string;
    locale: SupportedLocale;
    adminUserId: string;
    data: {
      displayName?: string;
      practitionerType?: PractitionerType;
      practitionerGender?: 'MALE' | 'FEMALE' | null;
      professionalTitle?: string | null;
      bio?: string | null;
      yearsOfExperience?: number | null;
      countryCode?: string | null;
      languageCodes?: string[];
      specialtySelection?: {
        primarySpecialtyCategoryId: string;
        specialtyIds: string[];
      };
      payoutDestination?: {
        methodType: PractitionerPayoutMethodType;
        accountHolderName?: string | null;
        bankName?: string | null;
        bankAccountNumber?: string | null;
        iban?: string | null;
        walletProvider?: string | null;
        walletIdentifier?: string | null;
        otherDetails?: string | null;
      } | null;
    };
  }) {
    const application = await this.applicationRepository.findById(input.id);
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

    const normalizedCountryCode =
      input.data.countryCode?.trim().toUpperCase() ?? null;
    let resolvedCountryId: string | null | undefined = undefined;

    if (input.data.countryCode !== undefined) {
      if (!normalizedCountryCode) {
        resolvedCountryId = null;
      } else {
        const country = await this.prisma.country.findFirst({
          where: {
            isoCode: normalizedCountryCode,
            isActive: true,
          },
          select: { id: true },
        });
        if (!country) {
          throw new BadRequestException({
            messageKey:
              'admin.practitionerApplications.errors.invalidCountryCode',
            error: 'ADMIN_INVALID_COUNTRY_CODE',
          });
        }
        resolvedCountryId = country.id;
      }
    }

    const normalizedLanguageCodes =
      input.data.languageCodes?.map((code) => code.trim().toLowerCase()) ?? [];
    const hasLanguagePayload = input.data.languageCodes !== undefined;
    if (hasLanguagePayload && normalizedLanguageCodes.length === 0) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.languageNotFound',
        error: 'ADMIN_INVALID_LANGUAGE_CODES',
      });
    }

    const uniqueLanguageCodes = Array.from(new Set(normalizedLanguageCodes));
    let resolvedLanguages: Array<{ id: string; code: string }> = [];
    if (hasLanguagePayload) {
      resolvedLanguages = await this.prisma.language.findMany({
        where: {
          code: { in: uniqueLanguageCodes },
          isActive: true,
        },
        select: {
          id: true,
          code: true,
        },
      });
      if (resolvedLanguages.length !== uniqueLanguageCodes.length) {
        throw new BadRequestException({
          messageKey: 'practitioners.errors.languageNotFound',
          error: 'ADMIN_INVALID_LANGUAGE_CODES',
        });
      }
    }

    const hasSpecialtySelection = Boolean(input.data.specialtySelection);
    const specialtySelection = input.data.specialtySelection;
    if (hasSpecialtySelection && specialtySelection) {
      await this.practitionerSpecialtyIntegrityService.validateSelection({
        primarySpecialtyCategoryId:
          specialtySelection.primarySpecialtyCategoryId,
        specialtyIds: specialtySelection.specialtyIds,
      });
    }

    if (input.data.payoutDestination !== undefined) {
      this.practitionerPayoutDestinationValidationService.validate(
        input.data.payoutDestination,
      );
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (input.data.displayName !== undefined) {
          await tx.user.update({
            where: { id: application.practitioner.userId },
            data: {
              displayName: input.data.displayName?.trim() || null,
            },
          });
        }

        const profileUpdateData: Prisma.PractitionerProfileUpdateInput = {};
        if (input.data.practitionerType !== undefined) {
          profileUpdateData.practitionerType = input.data.practitionerType;
        }
        if (input.data.practitionerGender !== undefined) {
          profileUpdateData.practitionerGender = input.data.practitionerGender;
        }
        if (input.data.professionalTitle !== undefined) {
          profileUpdateData.professionalTitle =
            input.data.professionalTitle?.trim() || null;
        }
        if (input.data.bio !== undefined) {
          profileUpdateData.bio = input.data.bio?.trim() || null;
        }
        if (input.data.yearsOfExperience !== undefined) {
          profileUpdateData.yearsOfExperience = input.data.yearsOfExperience;
        }
        if (resolvedCountryId !== undefined) {
          profileUpdateData.country =
            resolvedCountryId === null
              ? { disconnect: true }
              : { connect: { id: resolvedCountryId } };
        }
        if (hasSpecialtySelection && specialtySelection) {
          profileUpdateData.primarySpecialtyCategory = {
            connect: { id: specialtySelection.primarySpecialtyCategoryId },
          };
        }

        if (Object.keys(profileUpdateData).length > 0) {
          await tx.practitionerProfile.update({
            where: { id: application.practitionerId },
            data: profileUpdateData,
          });
        }

        if (hasLanguagePayload) {
          await tx.practitionerProfileLanguage.deleteMany({
            where: { practitionerId: application.practitionerId },
          });
          await tx.practitionerProfileLanguage.createMany({
            data: resolvedLanguages.map((language, index) => ({
              practitionerId: application.practitionerId,
              languageId: language.id,
              isPrimary: index === 0,
            })),
          });
        }

        if (hasSpecialtySelection && specialtySelection) {
          await tx.practitionerSpecialty.deleteMany({
            where: { practitionerId: application.practitionerId },
          });
          await tx.practitionerSpecialty.createMany({
            data: specialtySelection.specialtyIds.map((specialtyId, index) => ({
              practitionerId: application.practitionerId,
              specialtyId,
              isPrimary: index === 0,
            })),
          });
        }

        if (input.data.payoutDestination !== undefined) {
          if (input.data.payoutDestination === null) {
            await tx.practitionerPayoutDestination.deleteMany({
              where: { practitionerId: application.practitionerId },
            });
          } else {
            await tx.practitionerPayoutDestination.upsert({
              where: { practitionerId: application.practitionerId },
              create: {
                practitionerId: application.practitionerId,
                methodType: input.data.payoutDestination.methodType,
                accountHolderName:
                  input.data.payoutDestination.accountHolderName?.trim() ||
                  null,
                bankName: input.data.payoutDestination.bankName?.trim() || null,
                bankAccountNumber:
                  input.data.payoutDestination.bankAccountNumber?.trim() ||
                  null,
                iban:
                  input.data.payoutDestination.iban?.trim().toUpperCase() ||
                  null,
                walletProvider:
                  input.data.payoutDestination.walletProvider?.trim() || null,
                walletIdentifier:
                  input.data.payoutDestination.walletIdentifier?.trim() || null,
                otherDetails:
                  input.data.payoutDestination.otherDetails?.trim() || null,
              },
              update: {
                methodType: input.data.payoutDestination.methodType,
                accountHolderName:
                  input.data.payoutDestination.accountHolderName?.trim() ||
                  null,
                bankName: input.data.payoutDestination.bankName?.trim() || null,
                bankAccountNumber:
                  input.data.payoutDestination.bankAccountNumber?.trim() ||
                  null,
                iban:
                  input.data.payoutDestination.iban?.trim().toUpperCase() ||
                  null,
                walletProvider:
                  input.data.payoutDestination.walletProvider?.trim() || null,
                walletIdentifier:
                  input.data.payoutDestination.walletIdentifier?.trim() || null,
                otherDetails:
                  input.data.payoutDestination.otherDetails?.trim() || null,
              },
            });
          }
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
            credentials: credentials.map((credential) => ({
              credentialId: credential.id,
              credentialType: credential.credentialType,
              fileUrl: credential.fileUrl,
              reviewStatus: credential.reviewStatus,
              expiresAt: credential.expiresAt,
              uploadedAt: credential.createdAt,
              reviewedAt: credential.reviewedAt ?? null,
              reviewedByUserId: credential.reviewedByUserId ?? null,
              reviewNotes: credential.reviewNotes ?? null,
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

        const updatedApplication =
          await this.applicationRepository.updateSubmissionSnapshot(
            application.id,
            submissionSnapshot,
            tx,
          );

        return updatedApplication;
      },
    );

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationFetched',
        input.locale,
      ),
      application: this.mapper.toDecision({
        applicationId: updated.id,
        practitionerProfileId: updated.practitioner.id,
        userId: updated.practitioner.userId,
        status: updated.status,
        reviewedAt: updated.reviewedAt,
        reviewedByUserId: updated.reviewedByUserId,
        reviewDecisionReason: updated.reviewDecisionReason,
        reviewNotes: updated.reviewNotes,
      }),
    };
  }
}
