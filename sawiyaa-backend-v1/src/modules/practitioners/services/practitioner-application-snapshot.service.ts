import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProfessionalContentSnapshot } from './practitioner-professional-content-authoring.service';

@Injectable()
export class PractitionerApplicationSnapshotService {
  build(input: {
    user: {
      displayName: string | null;
      defaultLocale: string | null;
      timezone: string | null;
    };
    profile: {
      practitionerType: string;
      practitionerGender: string | null;
      professionalTitle: string | null;
      bio: string | null;
      professionalContent?: ProfessionalContentSnapshot | null;
      primaryContentLocale?: 'ar' | 'en' | null;
      yearsOfExperience: number | null;
      countryCode: string | null;
      primarySpecialtyCategoryId: string | null;
      sessionPrice30Egp?: Prisma.Decimal | number | string | null;
      sessionPrice30Usd?: Prisma.Decimal | number | string | null;
      sessionPrice60Egp?: Prisma.Decimal | number | string | null;
      sessionPrice60Usd?: Prisma.Decimal | number | string | null;
      instantBookingPrice30Egp?: Prisma.Decimal | number | string | null;
      instantBookingPrice30Usd?: Prisma.Decimal | number | string | null;
      instantBookingPrice60Egp?: Prisma.Decimal | number | string | null;
      instantBookingPrice60Usd?: Prisma.Decimal | number | string | null;
    };
    languageCodes: string[];
    specialties: Array<{
      specialtyId: string;
      slug: string;
      title: string | null;
      isPrimary: boolean;
      categoryId: string | null;
    }>;
    credentials: Array<{
      credentialId: string;
      credentialType: string;
      fileUrl: string;
      reviewStatus: string;
      expiresAt: Date | null;
      uploadedAt: Date;
      reviewedAt: Date | null;
      reviewNotes: string | null;
    }>;
    payoutDestination: {
      methodType: string;
      countryCode: string | null;
      accountHolderName: string | null;
      bankName: string | null;
      bankAccountNumber: string | null;
      iban: string | null;
      walletProvider: string | null;
      walletIdentifier: string | null;
      otherDetails: string | null;
    } | null;
    avatarUrl?: string | null;
  }): Prisma.InputJsonValue {
    return {
      applicant: {
        displayName: input.user.displayName,
        locale: input.user.defaultLocale,
        timezone: input.user.timezone,
      },
      profile: {
        practitionerType: input.profile.practitionerType,
        practitionerGender: input.profile.practitionerGender,
        professionalTitle: input.profile.professionalTitle,
        bio: input.profile.bio,
        ...(input.profile.professionalContent
          ? { professionalContent: input.profile.professionalContent }
          : {}),
        ...(input.profile.primaryContentLocale !== undefined
          ? { primaryContentLocale: input.profile.primaryContentLocale }
          : {}),
        yearsOfExperience: input.profile.yearsOfExperience,
        countryCode: input.profile.countryCode,
        avatarUrl: input.avatarUrl,
      },
      specialtySelection: {
        primarySpecialtyCategoryId: input.profile.primarySpecialtyCategoryId,
        specialties: input.specialties.map((specialty) => ({
          specialtyId: specialty.specialtyId,
          slug: specialty.slug,
          title: specialty.title,
          isPrimary: specialty.isPrimary,
          categoryId: specialty.categoryId,
        })),
      },
      languageCodes: input.languageCodes,
      credentials: input.credentials.map((credential) => ({
        credentialId: credential.credentialId,
        credentialType: credential.credentialType,
        fileUrl: credential.fileUrl,
        reviewStatus: credential.reviewStatus,
        expiresAt: credential.expiresAt?.toISOString() ?? null,
        uploadedAt: credential.uploadedAt.toISOString(),
        reviewedAt: credential.reviewedAt?.toISOString() ?? null,
        reviewNotes: credential.reviewNotes,
      })),
      payoutDestination: input.payoutDestination,
    };
  }
}
