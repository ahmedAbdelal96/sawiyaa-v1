import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  AuthProvider,
  CredentialType,
  OtpChannel,
  PractitionerApplicationStatus,
  PractitionerPayoutMethodType,
  PractitionerStatus,
  PractitionerGender,
  PractitionerType,
  Prisma,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildDraftPractitionerSlug } from '@modules/auth/utils/slug.util';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { PractitionerApplicationSnapshotService } from '@modules/practitioners/services/practitioner-application-snapshot.service';
import { PractitionerPayoutDestinationValidationService } from '@modules/practitioners/services/practitioner-payout-destination-validation.service';
import { PractitionerSpecialtyIntegrityService } from '@modules/practitioners/services/practitioner-specialty-integrity.service';

/**
 * Creates a practitioner directly from admin scope without practitioner self-submission.
 * V1 behavior is intentionally narrow: create approved baseline account + approved application audit record.
 */
@Injectable()
export class CreateAdminPractitionerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
    private readonly mapper: PractitionerApplicationsAdminMapper,
    private readonly practitionerSpecialtyIntegrityService: PractitionerSpecialtyIntegrityService,
    private readonly practitionerPayoutDestinationValidationService: PractitionerPayoutDestinationValidationService,
    private readonly practitionerApplicationSnapshotService: PractitionerApplicationSnapshotService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>(
      'auth.password.saltRounds',
      12,
    );
    return bcrypt.hash(password, saltRounds);
  }

  async execute(input: {
    locale: SupportedLocale;
    adminUserId: string;
    email: string;
    password: string;
    displayName?: string | null;
    practitionerType?: PractitionerType;
    practitionerGender?: PractitionerGender | null;
    professionalTitle?: string | null;
    bio?: string | null;
    yearsOfExperience?: number | null;
    countryCode?: string | null;
    languageCodes: string[];
    specialtySelection: {
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
    credentials?: Array<{
      credentialType: CredentialType;
      fileUrl: string;
      expiresAt?: string;
    }>;
    note?: string | null;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingEmail = await this.prisma.userEmail.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingEmail) {
      throw new ConflictException({
        messageKey: 'auth.errors.emailAlreadyRegistered',
        error: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    const normalizedCountryCode =
      input.countryCode?.trim().toUpperCase() || null;
    let countryId: string | null = null;
    if (normalizedCountryCode) {
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

      countryId = country.id;
    }

    const passwordHash = await this.hashPassword(input.password);
    const displayName = input.displayName?.trim() || null;
    const professionalTitle = input.professionalTitle?.trim() || null;
    const practitionerType = input.practitionerType ?? PractitionerType.OTHER;
    const practitionerGender = input.practitionerGender ?? null;
    const bio = input.bio?.trim() || null;
    const yearsOfExperience =
      typeof input.yearsOfExperience === 'number'
        ? input.yearsOfExperience
        : null;
    const languageCodes = Array.from(
      new Set(
        input.languageCodes
          .map((code) => code.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    const specialtyIds = Array.from(
      new Set(
        input.specialtySelection.specialtyIds
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    );
    const credentials = (input.credentials ?? [])
      .map((item) => ({
        credentialType: item.credentialType,
        fileUrl: item.fileUrl.trim(),
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
      }))
      .filter((item) => item.fileUrl.length > 0);
    const payoutDestination = input.payoutDestination
      ? {
          methodType: input.payoutDestination.methodType,
          accountHolderName:
            input.payoutDestination.accountHolderName?.trim() || null,
          bankName: input.payoutDestination.bankName?.trim() || null,
          bankAccountNumber:
            input.payoutDestination.bankAccountNumber?.trim() || null,
          iban: input.payoutDestination.iban?.trim().toUpperCase() || null,
          walletProvider:
            input.payoutDestination.walletProvider?.trim() || null,
          walletIdentifier:
            input.payoutDestination.walletIdentifier?.trim() || null,
          otherDetails: input.payoutDestination.otherDetails?.trim() || null,
        }
      : null;
    const now = new Date();
    const auditNote = input.note?.trim() || null;
    const reviewNotes = auditNote
      ? `[ADMIN_DIRECT_CREATE:${input.adminUserId}] ${auditNote}`
      : `[ADMIN_DIRECT_CREATE:${input.adminUserId}]`;

    if (yearsOfExperience !== null && yearsOfExperience < 0) {
      throw new BadRequestException({
        messageKey:
          'admin.practitionerApplications.errors.invalidYearsOfExperience',
        error: 'ADMIN_INVALID_YEARS_OF_EXPERIENCE',
      });
    }

    if (languageCodes.length === 0) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.languageNotFound',
        error: 'ADMIN_INVALID_LANGUAGE_CODES',
      });
    }

    const resolvedLanguages = await this.prisma.language.findMany({
      where: {
        code: { in: languageCodes },
        isActive: true,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (resolvedLanguages.length !== languageCodes.length) {
      throw new BadRequestException({
        messageKey: 'practitioners.errors.languageNotFound',
        error: 'ADMIN_INVALID_LANGUAGE_CODES',
      });
    }

    await this.practitionerSpecialtyIntegrityService.validateSelection({
      primarySpecialtyCategoryId:
        input.specialtySelection.primarySpecialtyCategoryId,
      specialtyIds,
    });
    this.practitionerPayoutDestinationValidationService.validate(
      payoutDestination,
    );

    const specialties = await this.prisma.specialty.findMany({
      where: {
        id: { in: specialtyIds },
      },
      select: {
        id: true,
        slug: true,
        categoryId: true,
        translations: {
          where: {
            locale: { in: ['en', 'ar'] },
          },
          select: {
            locale: true,
            title: true,
          },
        },
      },
    });
    const specialtyById = new Map(
      specialties.map((item) => [item.id, item] as const),
    );

    const created = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            displayName,
            status: UserStatus.ACTIVE,
          },
        });

        await tx.userRole.create({
          data: {
            userId: user.id,
            role: UserRoleType.PRACTITIONER,
          },
        });

        await tx.userEmail.create({
          data: {
            userId: user.id,
            email: normalizedEmail,
            isPrimary: true,
            isVerified: true,
          },
        });

        await tx.authIdentity.create({
          data: {
            userId: user.id,
            provider: AuthProvider.PASSWORD,
            passwordHash,
            isEnabled: true,
          },
        });

        await tx.twoFactorSetting.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            isRequired: true,
            preferredChannel: OtpChannel.EMAIL,
            enabledAt: now,
          },
          update: {
            isRequired: true,
            preferredChannel: OtpChannel.EMAIL,
            enabledAt: now,
          },
        });

        const practitionerProfile = await tx.practitionerProfile.create({
          data: {
            userId: user.id,
            publicSlug: buildDraftPractitionerSlug(
              displayName ?? normalizedEmail,
            ),
            practitionerType,
            practitionerGender,
            professionalTitle,
            bio,
            yearsOfExperience,
            status: PractitionerStatus.APPROVED,
            countryId,
            primarySpecialtyCategoryId:
              input.specialtySelection.primarySpecialtyCategoryId,
            isPublicProfilePublished: false,
          },
        });

        await tx.practitionerProfileLanguage.createMany({
          data: resolvedLanguages.map((language, index) => ({
            practitionerId: practitionerProfile.id,
            languageId: language.id,
            isPrimary: index === 0,
          })),
        });

        if (specialtyIds.length > 0) {
          await tx.practitionerSpecialty.createMany({
            data: specialtyIds.map((specialtyId, index) => ({
              practitionerId: practitionerProfile.id,
              specialtyId,
              isPrimary: index === 0,
            })),
          });
        }

        if (payoutDestination) {
          await tx.practitionerPayoutDestination.create({
            data: {
              practitionerId: practitionerProfile.id,
              methodType: payoutDestination.methodType,
              accountHolderName: payoutDestination.accountHolderName,
              bankName: payoutDestination.bankName,
              bankAccountNumber: payoutDestination.bankAccountNumber,
              iban: payoutDestination.iban,
              walletProvider: payoutDestination.walletProvider,
              walletIdentifier: payoutDestination.walletIdentifier,
              otherDetails: payoutDestination.otherDetails,
            },
          });
        }

        if (credentials.length > 0) {
          await tx.practitionerCredential.createMany({
            data: credentials.map((item) => ({
              practitionerId: practitionerProfile.id,
              credentialType: item.credentialType,
              fileUrl: item.fileUrl,
              expiresAt: item.expiresAt,
            })),
          });
        }

        const application = await tx.practitionerApplication.create({
          data: {
            practitionerId: practitionerProfile.id,
            status: PractitionerApplicationStatus.APPROVED,
            submittedAt: now,
            reviewedAt: now,
            reviewedByUserId: input.adminUserId,
            reviewDecisionReason: 'ADMIN_DIRECT_CREATE',
            reviewNotes,
            submissionSnapshot:
              this.practitionerApplicationSnapshotService.build({
                user: {
                  displayName,
                  defaultLocale: null,
                  timezone: null,
                },
                profile: {
                  practitionerType,
                  practitionerGender,
                  professionalTitle,
                  bio,
                  yearsOfExperience,
                  countryCode: normalizedCountryCode,
                  primarySpecialtyCategoryId:
                    input.specialtySelection.primarySpecialtyCategoryId,
                },
                languageCodes,
                specialties: specialtyIds.map((specialtyId, index) => ({
                  specialtyId,
                  slug: specialtyById.get(specialtyId)?.slug ?? '',
                  title:
                    specialtyById
                      .get(specialtyId)
                      ?.translations.find((item) => item.locale === 'en')
                      ?.title ?? null,
                  isPrimary: index === 0,
                  categoryId:
                    specialtyById.get(specialtyId)?.categoryId ?? null,
                })),
                credentials: credentials.map((item) => ({
                  credentialId: '',
                  credentialType: item.credentialType,
                  fileUrl: item.fileUrl,
                  reviewStatus: 'PENDING',
                  expiresAt: item.expiresAt,
                  uploadedAt: now,
                  reviewedAt: null,
                  reviewNotes: null,
                })),
                payoutDestination,
              }),
          },
        });

        return { user, practitionerProfile, application };
      },
    );

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.practitionerCreatedDirectly',
        input.locale,
      ),
      application: this.mapper.toDecision({
        applicationId: created.application.id,
        practitionerProfileId: created.practitionerProfile.id,
        userId: created.user.id,
        status: created.application.status,
        reviewedAt: created.application.reviewedAt,
        reviewedByUserId: created.application.reviewedByUserId,
        reviewDecisionReason: created.application.reviewDecisionReason,
        reviewNotes: created.application.reviewNotes,
      }),
    };
  }
}
