import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PractitionerApplicationStatus,
  PractitionerStatus,
  ReviewSection,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerApplicationSnapshotService } from './practitioner-application-snapshot.service';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';
import { PractitionerReviewCaseService } from './practitioner-review-case.service';

type DbClient = PrismaService | Prisma.TransactionClient;

type ProfileOverrides = Partial<{
  practitionerType: string | null;
  practitionerGender: string | null;
  professionalTitle: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  countryCode: string | null;
}>;

/** Creates or merges the single active review request for an approved practitioner. */
@Injectable()
export class PractitionerChangeReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationRepository: PractitionerApplicationRepository,
    private readonly snapshotService: PractitionerApplicationSnapshotService,
    private readonly reviewCaseService: PractitionerReviewCaseService,
  ) {}

  async upsert(input: {
    practitionerId: string;
    profile?: ProfileOverrides;
    specialtySelection?: {
      primarySpecialtyCategoryId: string | null;
      specialtyIds: string[];
    };
    tx?: Prisma.TransactionClient;
  }) {
    const db: DbClient = input.tx ?? this.prisma;
    const profile = await db.practitionerProfile.findUnique({
      where: { id: input.practitionerId },
      include: {
        user: { select: { displayName: true, defaultLocale: true, timezone: true } },
        country: { select: { isoCode: true } },
        languages: { include: { language: { select: { code: true } } } },
        specialties: {
          include: {
            specialty: {
              select: {
                id: true,
                slug: true,
                categoryId: true,
                translations: { where: { locale: { in: ['ar', 'en'] } }, select: { locale: true, title: true } },
              },
            },
          },
        },
        credentials: true,
        payoutDestination: true,
      },
    });

    if (!profile || profile.status !== PractitionerStatus.APPROVED) {
      return null;
    }

    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.practitionerId}))`;
    const active = await this.applicationRepository.findActiveChangeByPractitionerId(input.practitionerId, input.tx);

    // Serialize the approved state, then replace only the sections being staged.
    const selectedSpecialtyIds = input.specialtySelection?.specialtyIds;
    const specialties = selectedSpecialtyIds
      ? await db.specialty.findMany({
          where: { id: { in: selectedSpecialtyIds }, isActive: true },
          select: {
            id: true,
            slug: true,
            categoryId: true,
            translations: { where: { locale: { in: ['ar', 'en'] } }, select: { locale: true, title: true } },
          },
        }).then((items) => selectedSpecialtyIds.map((id, index) => {
          const specialty = items.find((item) => item.id === id);
          return {
            specialtyId: id,
            slug: specialty?.slug ?? '',
            title: specialty?.translations.find((t) => t.locale === 'en')?.title ?? null,
            isPrimary: index === 0,
            categoryId: specialty?.categoryId ?? null,
          };
        }))
      : profile.specialties.map((item) => ({
          specialtyId: item.specialtyId,
          slug: item.specialty.slug,
          title: item.specialty.translations.find((t) => t.locale === 'en')?.title ?? null,
          isPrimary: item.isPrimary,
          categoryId: item.specialty.categoryId ?? null,
        }));

    const snapshot = this.snapshotService.build({
      user: profile.user,
      profile: {
        practitionerType: String(input.profile?.practitionerType ?? profile.practitionerType),
        practitionerGender: input.profile?.practitionerGender !== undefined ? input.profile.practitionerGender : profile.practitionerGender,
        professionalTitle: input.profile?.professionalTitle !== undefined ? input.profile.professionalTitle : profile.professionalTitle,
        bio: input.profile?.bio !== undefined ? input.profile.bio : profile.bio,
        yearsOfExperience: input.profile?.yearsOfExperience !== undefined ? input.profile.yearsOfExperience : profile.yearsOfExperience,
        countryCode: input.profile?.countryCode !== undefined ? input.profile.countryCode : profile.country?.isoCode ?? null,
        primarySpecialtyCategoryId: input.specialtySelection?.primarySpecialtyCategoryId ?? profile.primarySpecialtyCategoryId,
        sessionPrice30Egp: profile.sessionPrice30Egp,
        sessionPrice30Usd: profile.sessionPrice30Usd,
        sessionPrice60Egp: profile.sessionPrice60Egp,
        sessionPrice60Usd: profile.sessionPrice60Usd,
        instantBookingPrice30Egp: profile.instantBookingPrice30Egp,
        instantBookingPrice30Usd: profile.instantBookingPrice30Usd,
        instantBookingPrice60Egp: profile.instantBookingPrice60Egp,
        instantBookingPrice60Usd: profile.instantBookingPrice60Usd,
      },
      languageCodes: profile.languages.map((item) => item.language.code),
      specialties,
      credentials: profile.credentials.map((credential) => ({
        credentialId: credential.id,
        credentialType: credential.credentialType,
        fileUrl: credential.fileUrl,
        reviewStatus: credential.reviewStatus,
        expiresAt: credential.expiresAt,
        uploadedAt: credential.createdAt,
        reviewedAt: credential.reviewedAt,
        reviewNotes: credential.reviewNotes,
      })),
      payoutDestination: profile.payoutDestination,
      avatarUrl: profile.avatarUrl,
    });

    // Serialize the requested section so Admin can render exact before/after data.
    const requested = snapshot as Record<string, any>;
    const previous = (active?.submissionSnapshot ?? null) as Record<string, any> | null;
    const previousSections = Array.isArray(previous?.review?.sections)
      ? previous.review.sections.filter((item): item is string => typeof item === 'string')
      : [];
    if (previousSections.includes('PROFILE') && previous?.profile) {
      const changedProfile = Object.fromEntries(
        Object.entries(input.profile ?? {}).filter(([, value]) => value !== undefined),
      );
      requested.profile = { ...previous.profile, ...changedProfile };
    }
    if (previousSections.includes('SPECIALTIES') && previous?.specialtySelection) {
      requested.specialtySelection = previous.specialtySelection;
    }
    const sections = new Set<string>([
      ...previousSections,
      ...(input.profile ? ['PROFILE'] : []),
      ...(input.specialtySelection ? ['SPECIALTIES'] : []),
      ...(!input.profile && !input.specialtySelection ? ['CREDENTIALS'] : []),
    ]);
    requested.review = {
      sections: [...sections],
      changedAt: new Date().toISOString(),
    };

    const legacyApplication = active
      ? await this.applicationRepository.updateSubmissionSnapshot(active.id, requested, input.tx)
      : await this.applicationRepository.createSubmitted(input.practitionerId, requested, input.tx);

    const sectionNames = Array.from(sections).filter((section): section is 'PROFILE' | 'SPECIALTIES' | 'CREDENTIALS' =>
      section === 'PROFILE' || section === 'SPECIALTIES' || section === 'CREDENTIALS',
    );
    const reviewCase = await this.reviewCaseService.upsertChangeCase({
      practitionerId: input.practitionerId,
      proposedSnapshot: requested as any,
      sections: sectionNames.map((section) =>
        section === 'PROFILE'
          ? 'PROFILE'
          : section === 'SPECIALTIES'
            ? 'SPECIALTIES'
            : 'PROFESSIONAL_CREDENTIALS',
      ),
      tx: input.tx,
    });

    if (input.profile?.professionalTitle !== undefined) {
      await this.reviewCaseService.markRequirementSubmitted({
        caseId: reviewCase.id,
        section: ReviewSection.PROFILE,
        fieldPath: 'professionalTitle',
        tx: input.tx,
      });
    }

    return legacyApplication;
  }
}
