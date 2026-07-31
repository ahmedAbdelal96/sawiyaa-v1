import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';

@Injectable()
export class GetAdminPractitionerDetailsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
  ) {}

  async execute(input: { id: string; locale: SupportedLocale }) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { id: input.id },
      include: {
        user: {
          include: {
            emails: true,
            phones: true,
          },
        },
        country: true,
        primarySpecialtyCategory: true,
        languages: {
          include: {
            language: true,
          },
        },
        payoutDestination: true,
        specialties: {
          include: {
            specialty: {
              include: {
                translations: true,
                category: true,
              },
            },
          },
        },
        credentials: true,
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException({
        messageKey: 'admin.practitioners.errors.practitionerNotFound',
        error: 'ADMIN_PRACTITIONER_NOT_FOUND',
      });
    }

    const [totalSessions, completedSessions, upcomingSessions, cancelledSessions] = await Promise.all([
      this.prisma.session.count({ where: { practitionerId: profile.id } }),
      this.prisma.session.count({ where: { practitionerId: profile.id, status: 'COMPLETED' } }),
      this.prisma.session.count({
        where: {
          practitionerId: profile.id,
          status: { in: ['UPCOMING', 'READY_TO_JOIN', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.session.count({ where: { practitionerId: profile.id, status: 'CANCELLED' } }),
    ]);

    const auditEvents = await this.prisma.auditEvent.findMany({
      where: {
        OR: [
          { targetEntityId: profile.id },
          { targetEntityId: profile.userId },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
      include: {
        actorUser: {
          select: {
            displayName: true,
          },
        },
      },
    });

    const payoutDestination = profile.payoutDestination
      ? {
          methodType: profile.payoutDestination.methodType,
          accountHolderName: profile.payoutDestination.accountHolderName,
          bankName: profile.payoutDestination.bankName,
          bankAccountNumber: profile.payoutDestination.bankAccountNumber
            ? profile.payoutDestination.bankAccountNumber.slice(0, 4) + '****'
            : null,
          iban: profile.payoutDestination.iban
            ? profile.payoutDestination.iban.slice(0, 6) + '******' + profile.payoutDestination.iban.slice(-4)
            : null,
          walletProvider: profile.payoutDestination.walletProvider,
          walletIdentifier: profile.payoutDestination.walletIdentifier,
          otherDetails: profile.payoutDestination.otherDetails,
        }
      : null;

    const latestApplication = profile.applications[0] ?? null;

    return {
      message: this.i18nService.t(
        'admin.practitionerApplications.success.applicationFetched',
        input.locale,
      ),
      details: {
        id: profile.id,
        userId: profile.userId,
        publicSlug: profile.publicSlug,
        displayName: profile.user.displayName,
        avatarUrl: profile.avatarUrl,
        accountStatus: profile.user.status,
        profileStatus: profile.status,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        countryCode: profile.country?.isoCode ?? null,
        countryName: profile.country?.name ?? null,
        email: profile.user.emails[0]?.email ?? null,
        phone: profile.user.phones[0]?.phone ?? null,
        timezone: profile.user.timezone ?? null,
        defaultLocale: profile.user.defaultLocale ?? null,
        practitionerType: profile.practitionerType,
        practitionerGender: profile.practitionerGender,
        professionalTitle: profile.professionalTitle,
        bio: profile.bio,
        yearsOfExperience: profile.yearsOfExperience,
        languages: profile.languages.map((l) => l.language.code),
        acceptsPackages: profile.acceptsPackages,
        isInstantBookingEnabled: profile.isInstantBookingEnabled,
        pricing: {
          session30: {
            egp: profile.sessionPrice30Egp ? Number(profile.sessionPrice30Egp) : null,
            usd: profile.sessionPrice30Usd ? Number(profile.sessionPrice30Usd) : null,
          },
          session60: {
            egp: profile.sessionPrice60Egp ? Number(profile.sessionPrice60Egp) : null,
            usd: profile.sessionPrice60Usd ? Number(profile.sessionPrice60Usd) : null,
          },
        },
        specialties: profile.specialties.map((s) => {
          const translations = s.specialty.translations;
          const arabicTranslation = translations.find((t) => t.locale === 'ar')?.title ?? null;
          const englishTranslation = translations.find((t) => t.locale === 'en')?.title ?? null;
          return {
            specialtyId: s.specialtyId,
            slug: s.specialty.slug,
            title: input.locale === 'ar' ? (arabicTranslation ?? englishTranslation) : (englishTranslation ?? arabicTranslation),
            isPrimary: s.isPrimary,
            category: s.specialty.category
              ? {
                  id: s.specialty.category.id,
                  slug: s.specialty.category.slug,
                  name: s.specialty.category.name,
                }
              : null,
          };
        }),
        credentials: profile.credentials.map((c) => ({
          credentialId: c.id,
          credentialType: c.credentialType,
          reviewStatus: c.reviewStatus,
          expiresAt: c.expiresAt,
          uploadedAt: c.createdAt,
          reviewNotes: c.reviewNotes,
        })),
        payoutDestination,
        application: latestApplication
          ? {
              applicationId: latestApplication.id,
              status: latestApplication.status,
              submittedAt: latestApplication.submittedAt,
              reviewedAt: latestApplication.reviewedAt,
              reviewedByUserId: latestApplication.reviewedByUserId,
              reviewDecisionReason: latestApplication.reviewDecisionReason,
              reviewNotes: latestApplication.reviewNotes,
            }
          : null,
        operations: {
          totalSessions,
          completedSessions,
          upcomingSessions,
          cancelledSessions,
        },
        auditLogs: auditEvents.map((e) => ({
          id: e.id,
          typeSlug: e.typeSlug,
          eventFamily: e.eventFamily,
          titleSnapshot: e.titleSnapshot,
          bodySnapshot: e.bodySnapshot,
          occurredAt: e.occurredAt,
          actorDisplayName: e.actorUser?.displayName ?? null,
        })),
      },
    };
  }
}
