import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CurrentUserMapper } from '../mappers/current-user.mapper';
import { PatientProfileRepository } from '../repositories/patient-profile.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { UserRepository } from '../repositories/user.repository';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserAvatarStorageService } from '../services/user-avatar-storage.service';

/**
 * This use case is the internal read orchestrator for Users Module.
 * It gathers current-user basics, roles, security inputs, and linked profile summaries into one read model.
 *
 * The module stays read-only on purpose: it does not mutate auth state, profile state, or onboarding workflows.
 */
@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly currentUserMapper: CurrentUserMapper,
    private readonly userAvatarStorageService: UserAvatarStorageService,
  ) {}

  async execute(authenticatedUser: AuthenticatedUser) {
    const [user, roles, patientProfile, practitionerProfile] =
      await Promise.all([
        this.userRepository.findCurrentUserBasics(authenticatedUser.id),
        this.userRoleRepository.listCurrentUserRoles(authenticatedUser.id),
        this.patientProfileRepository.findLinkedProfile(authenticatedUser.id),
        this.practitionerProfileRepository.findLinkedProfile(
          authenticatedUser.id,
        ),
      ]);

    if (!user) {
      throw new NotFoundException({
        messageKey: 'users.errors.currentUserNotFound',
        error: 'CURRENT_USER_NOT_FOUND',
      });
    }

    const avatarMeta =
      await this.userAvatarStorageService.resolveAvatarMetadata(
        authenticatedUser.id,
      );
    // Avatar binary is intentionally embedded as a data URL so the frontend can render it
    // without needing auth headers on <img> requests.
    const avatarDataUrl = avatarMeta?.avatarUrl
      ? await this.userAvatarStorageService.resolveAvatarDataUrl(
          authenticatedUser.id,
        )
      : null;

    return this.currentUserMapper.toReadModel({
      basics: this.currentUserMapper.toBasics(user),
      roles: this.currentUserMapper.mapRoles(roles),
      profileLinks: this.currentUserMapper.toProfileLinks({
        patientProfile,
        practitionerProfile,
      }),
      authenticatedUser,
      avatarUrl: avatarMeta?.avatarUrl ?? null,
      avatarDataUrl,
    });
  }
}
