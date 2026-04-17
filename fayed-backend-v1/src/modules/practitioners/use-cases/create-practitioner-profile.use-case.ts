import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerUserRepository } from '../repositories/practitioner-user.repository';
import { buildDraftPractitionerSlug } from '../utils/build-draft-practitioner-slug.util';

/**
 * Ensures a baseline practitioner profile exists for write flows.
 * GET flows stay side-effect free; bootstrap happens on write-oriented actions.
 */
@Injectable()
export class CreatePractitionerProfileUseCase {
  constructor(
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerUserRepository: PractitionerUserRepository,
  ) {}

  async execute(userId: string, tx?: Prisma.TransactionClient) {
    const existingProfile = await this.practitionerProfileRepository.findByUserId(
      userId,
      tx,
    );

    if (existingProfile) {
      return existingProfile;
    }

    const user = await this.practitionerUserRepository.findProfileSeed(userId, tx);

    if (!user) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.userNotFound',
        error: 'PRACTITIONER_USER_NOT_FOUND',
      });
    }

    return this.practitionerProfileRepository.createDraft(
      {
        userId,
        publicSlug: buildDraftPractitionerSlug(user.displayName ?? user.id),
      },
      tx,
    );
  }
}

