import { Injectable, NotFoundException } from '@nestjs/common';
import type { SupportedLocale } from '@common/i18n/types/locale.types';
import { AdminPatientDirectoryRepository } from '../repositories/admin-patient-directory.repository';

@Injectable()
export class GetAdminPatientDetailsUseCase {
  constructor(private readonly repository: AdminPatientDirectoryRepository) {}

  async execute(input: { locale: SupportedLocale; patientId: string }) {
    const row = await this.repository.findDetails(input.patientId);
    if (!row) throw new NotFoundException('Patient not found');

    const roles = row.user.roles.map((r) => r.role);
    if (!roles.includes('PATIENT'))
      throw new NotFoundException('Patient not found');

    return {
      message: 'Patient fetched successfully.',
      item: {
        id: row.id,
        userId: row.userId,
        displayName: row.user.displayName ?? row.displayName ?? null,
        primaryEmail: row.user.emails[0]?.email ?? null,
        primaryPhone: row.user.phones[0]?.phone ?? null,
        status: row.user.status,
        countryCode: row.country?.isoCode ?? null,
        gender: row.gender ?? null,
        dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        packages: row.packagePurchases.map((purchase) => {
          const completed = purchase.sessions.filter((s) => s.status === 'COMPLETED').length;
          const reserved = purchase.sessions.filter((s) => ['UPCOMING', 'READY_TO_JOIN', 'IN_PROGRESS'].includes(s.status)).length;
          const next = purchase.sessions.find((s) => s.scheduledStartAt && new Date(s.scheduledStartAt).getTime() >= Date.now() && ['UPCOMING', 'READY_TO_JOIN', 'IN_PROGRESS'].includes(s.status));
          return {
            id: purchase.id,
            title: purchase.titleSnapshot || purchase.packagePlan?.title || purchase.planCodeSnapshot,
            planCode: purchase.planCodeSnapshot || purchase.packagePlan?.code || null,
            status: purchase.status,
            sessionCount: purchase.sessionCountSnapshot,
            completedSessions: completed,
            reservedSessions: reserved,
            availableSessions: Math.max(0, purchase.sessionCountSnapshot - completed - reserved),
            nextSessionAt: next?.scheduledStartAt?.toISOString() ?? null,
            amount: purchase.selectedAmountSnapshot.toString(),
            currency: purchase.selectedCurrencyCode,
            paidAt: purchase.paidAt?.toISOString() ?? null,
            refundedAt: purchase.refundedAt?.toISOString() ?? null,
            practitioner: purchase.practitioner ? { id: purchase.practitioner.id, name: purchase.practitioner.user?.displayName ?? purchase.practitioner.publicSlug } : null,
            settlementId: purchase.packageSettlement?.id ?? null,
          };
        }),
        academy: row.academyProgramEnrollments.map((enrollment) => ({
          id: enrollment.id,
          programId: enrollment.academyProgram.id,
          programSlug: enrollment.academyProgram.slug,
          programTitleAr: enrollment.academyProgram.titleAr,
          programTitleEn: enrollment.academyProgram.titleEn,
          status: enrollment.status,
          paymentStatus: enrollment.paymentStatus,
          amount: enrollment.selectedAmountSnapshot.toString(),
          currency: enrollment.selectedCurrencyCode,
          registeredAt: enrollment.registeredAt.toISOString(),
          attendanceCount: enrollment._count.attendanceRecords,
          totalSessions: enrollment.academyProgram.sessions.length,
          certificateIssued: Boolean(enrollment.certificateIssuedAt || enrollment.certificateFileStoragePath),
          paymentId: enrollment.payment?.id ?? null,
        })),
      },
    };
  }
}
