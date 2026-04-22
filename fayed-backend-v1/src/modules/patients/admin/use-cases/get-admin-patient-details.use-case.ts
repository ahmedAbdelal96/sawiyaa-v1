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
      },
    };
  }
}
