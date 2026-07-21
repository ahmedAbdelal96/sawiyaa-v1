import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramPresenter } from './academy-program.presenter';
import { AcademyProgramEnrollmentStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class AcademyProgramEnrollmentPresenter {
  constructor(private readonly academyProgramPresenter: AcademyProgramPresenter) {}

  presentEnrollmentItem(
    input: {
      id: string;
      publicAccessToken: string;
      userId: string | null;
      status: AcademyProgramEnrollmentStatus | string;
      paymentStatus: PaymentStatus | string;
      registeredAt: Date;
      lockedAt: Date | null;
      seatReservedAt: Date | null;
      seatReservationExpiresAt: Date | null;
      confirmedAt: Date | null;
      cancelledAt: Date | null;
      expiredAt: Date | null;
      completedAt: Date | null;
      certificateIssuedAt: Date | null;
      certificateFileStoragePath: string | null;
      certificateFileName: string | null;
      certificateUploadedAt: Date | null;
      certificateUploadedByUserId: string | null;
      selectedCurrencyCode: string;
      selectedAmountSnapshot: { toString(): string };
      submittedCountry: string | null;
      lockedCountry: string | null;
      lockedCountrySource: string | null;
      contactFullName: string;
      contactEmail: string | null;
      contactPhone: string;
      contactWhatsapp: string | null;
      contactCountry: string | null;
      contactNotes: string | null;
      academyProgram: Parameters<
        AcademyProgramPresenter['presentPublicProgramItem']
      >[0];
      academyLearner: {
        id: string;
        userId: string | null;
        fullName: string;
        phoneNumber: string;
        whatsappNumber: string | null;
        email: string | null;
        countryCode: string | null;
        countryCodeDeclared: string | null;
        countryCodeSource: string | null;
        countryCodeMismatch: boolean;
        sourceLabel: string | null;
        city: string | null;
        jobTitle: string | null;
        employer: string | null;
        education: string | null;
        notes: string | null;
      };
      user?: {
        id: string;
        displayName: string | null;
        status: string;
        defaultLocale: string | null;
        timezone: string | null;
      } | null;
      payment?: {
        id: string;
        provider: string;
        status: PaymentStatus;
        amountSubtotal: { toString(): string };
        amountDiscount: { toString(): string };
        amountTotal: { toString(): string };
        currencyCode: string;
        providerPaymentRef: string | null;
        providerOrderRef: string | null;
        providerCustomerRef: string | null;
        metadataJson: unknown;
      } | null;
      paymentAttempts?: Array<{
        id: string;
        provider: string;
        status: PaymentStatus;
        amountSubtotal: { toString(): string };
        amountDiscount: { toString(): string };
        amountTotal: { toString(): string };
        currencyCode: string;
        providerPaymentRef: string | null;
        providerOrderRef: string | null;
        providerCustomerRef: string | null;
        checkoutUrl: string | null;
        clientSecret: string | null;
        failureReason: string | null;
        expiresAt: Date | null;
        confirmedAt: Date | null;
        failedAt: Date | null;
        createdAt: Date;
      }>;
      attendanceSummarySnapshot?: unknown;
    },
    locale: SupportedLocale,
  ) {
    const latestAttempt = input.paymentAttempts?.[0] ?? null;
    const paymentMetadata = (input.payment?.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    const attendanceSummary = this.resolveAttendanceSummary(input);

    return {
      id: input.id,
      publicAccessToken: input.publicAccessToken,
      userId: input.userId,
      status: input.status,
      paymentStatus: input.paymentStatus,
      registeredAt: input.registeredAt.toISOString(),
      lockedAt: input.lockedAt?.toISOString() ?? null,
      seatReservedAt: input.seatReservedAt?.toISOString() ?? null,
      seatReservationExpiresAt:
        input.seatReservationExpiresAt?.toISOString() ?? null,
      confirmedAt: input.confirmedAt?.toISOString() ?? null,
      cancelledAt: input.cancelledAt?.toISOString() ?? null,
      expiredAt: input.expiredAt?.toISOString() ?? null,
      completedAt: input.completedAt?.toISOString() ?? null,
      certificateIssuedAt: input.certificateIssuedAt?.toISOString() ?? null,
      selectedCurrencyCode: input.selectedCurrencyCode,
      selectedAmountSnapshot: input.selectedAmountSnapshot.toString(),
      submittedCountry: input.submittedCountry,
      lockedCountry: input.lockedCountry,
      lockedCountrySource: input.lockedCountrySource,
      contactFullName: input.contactFullName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      contactWhatsapp: input.contactWhatsapp,
      contactCountry: input.contactCountry,
      contactNotes: input.contactNotes,
      user: input.user
        ? {
            id: input.user.id,
            displayName: input.user.displayName,
            status: input.user.status,
            defaultLocale: input.user.defaultLocale,
            timezone: input.user.timezone,
          }
        : null,
      program: this.academyProgramPresenter.presentPublicProgramItem(
        input.academyProgram,
        locale,
        input.selectedCurrencyCode === 'EGP' ? 'EG' : 'US',
      ),
      learner: {
        id: input.academyLearner.id,
        userId: input.academyLearner.userId,
        fullName: input.academyLearner.fullName,
        phoneNumber: input.academyLearner.phoneNumber,
        whatsappNumber: input.academyLearner.whatsappNumber,
        email: input.academyLearner.email,
        countryCode: input.academyLearner.countryCode,
        countryCodeDeclared: input.academyLearner.countryCodeDeclared,
        countryCodeSource: input.academyLearner.countryCodeSource,
        countryCodeMismatch: input.academyLearner.countryCodeMismatch,
        sourceLabel: input.academyLearner.sourceLabel,
        city: input.academyLearner.city,
        jobTitle: input.academyLearner.jobTitle,
        employer: input.academyLearner.employer,
        education: input.academyLearner.education,
        notes: input.academyLearner.notes,
      },
      payment: input.payment
        ? {
            id: input.payment.id,
            provider: input.payment.provider,
            status: input.payment.status,
            amountSubtotal: input.payment.amountSubtotal.toString(),
            amountDiscount: input.payment.amountDiscount.toString(),
            amountTotal: input.payment.amountTotal.toString(),
            currencyCode: input.payment.currencyCode,
            checkoutUrl:
              typeof paymentMetadata.checkoutUrl === 'string'
                ? paymentMetadata.checkoutUrl
                : (latestAttempt?.checkoutUrl ?? null),
            clientSecret:
              typeof paymentMetadata.clientSecret === 'string'
                ? paymentMetadata.clientSecret
                : (latestAttempt?.clientSecret ?? null),
          }
        : latestAttempt
          ? {
              id: latestAttempt.id,
              provider: latestAttempt.provider,
              status: latestAttempt.status,
              amountSubtotal: latestAttempt.amountSubtotal.toString(),
              amountDiscount: latestAttempt.amountDiscount.toString(),
              amountTotal: latestAttempt.amountTotal.toString(),
              currencyCode: latestAttempt.currencyCode,
              checkoutUrl: latestAttempt.checkoutUrl,
              clientSecret: latestAttempt.clientSecret,
            }
          : null,
      attendanceSummary,
      certificate: {
        status: this.resolveCertificateStatus(input),
        issuedAt: input.certificateIssuedAt?.toISOString() ?? null,
        uploadedAt: input.certificateUploadedAt?.toISOString() ?? null,
        fileName: input.certificateFileName,
        downloadAvailable: Boolean(input.certificateFileStoragePath),
      },
    };
  }

  private resolveCertificateStatus(input: {
    certificateIssuedAt: Date | null;
    certificateUploadedAt: Date | null;
    certificateFileStoragePath: string | null;
  }) {
    if (!input.certificateIssuedAt && !input.certificateFileStoragePath) {
      return 'NOT_ISSUED';
    }

    if (
      input.certificateIssuedAt &&
      input.certificateUploadedAt &&
      input.certificateUploadedAt.getTime() > input.certificateIssuedAt.getTime()
    ) {
      return 'REISSUED';
    }

    return 'ISSUED';
  }

  private resolveAttendanceSummary(input: {
    attendanceSummarySnapshot?: unknown;
    completedAt: Date | null;
    academyProgram: {
      _count?: {
        sessions?: number;
      };
    };
  }) {
    const snapshot = this.normalizeAttendanceSummarySnapshot(
      input.attendanceSummarySnapshot,
    );
    if (snapshot) {
      return snapshot;
    }

    const totalSessions = input.academyProgram._count?.sessions ?? 0;
    const attendedSessions = input.completedAt ? totalSessions : 0;
    const absentSessions = totalSessions - attendedSessions;
    const unmarkedSessions = Math.max(0, totalSessions - attendedSessions - absentSessions);
    const attendancePercentage =
      totalSessions > 0
        ? Math.round((attendedSessions / totalSessions) * 100)
        : 0;

    return {
      totalSessions,
      attendedSessions,
      absentSessions,
      unmarkedSessions,
      attendancePercentage,
    };
  }

  private normalizeAttendanceSummarySnapshot(value: unknown) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const snapshot = value as {
      totalSessions?: unknown;
      attendedSessions?: unknown;
      absentSessions?: unknown;
      unmarkedSessions?: unknown;
      attendancePercentage?: unknown;
    };

    const totalSessions = Number(snapshot.totalSessions);
    const attendedSessions = Number(snapshot.attendedSessions);
    const absentSessions = Number(snapshot.absentSessions);
    const unmarkedSessionsRaw = Number(snapshot.unmarkedSessions);
    const attendancePercentage = Number(snapshot.attendancePercentage);
    const unmarkedSessions = Number.isNaN(unmarkedSessionsRaw)
      ? Math.max(0, totalSessions - attendedSessions - absentSessions)
      : unmarkedSessionsRaw;

    if (
      Number.isNaN(totalSessions) ||
      Number.isNaN(attendedSessions) ||
      Number.isNaN(absentSessions) ||
      Number.isNaN(attendancePercentage)
    ) {
      return null;
    }

    return {
      totalSessions,
      attendedSessions,
      absentSessions,
      unmarkedSessions,
      attendancePercentage,
    };
  }
}
