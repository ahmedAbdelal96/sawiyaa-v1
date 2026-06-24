import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PatientProfileRepository } from '../repositories/patient-profile.repository';
import { PatientUserRepository } from '../repositories/patient-user.repository';

/**
 * This use case ensures a baseline patient profile exists for the current patient.
 * It is used internally by write/onboarding flows so the module can recover cleanly when a profile was not bootstrapped earlier.
 * We intentionally avoid calling it from the GET flow to keep reads free from persistence side effects.
 */
@Injectable()
export class CreatePatientProfileUseCase {
  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly patientUserRepository: PatientUserRepository,
  ) {}

  async execute(userId: string, tx?: Prisma.TransactionClient) {
    const existingProfile = await this.patientProfileRepository.findByUserId(
      userId,
      tx,
    );

    if (existingProfile) {
      return existingProfile;
    }

    const user = await this.patientUserRepository.findProfileSeed(userId, tx);

    if (!user) {
      throw new NotFoundException({
        messageKey: 'patients.errors.userNotFound',
        error: 'PATIENT_USER_NOT_FOUND',
      });
    }

    return this.patientProfileRepository.create(
      {
        userId,
        displayName: user.displayName ?? null,
      },
      tx,
    );
  }
}
