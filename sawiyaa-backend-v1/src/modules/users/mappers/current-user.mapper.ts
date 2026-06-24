import { Injectable } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { UserRoleType, UserStatus } from '@prisma/client';
import { normalizeAppRoles } from '@modules/auth/utils/auth-role.util';
import { buildRoleSummary } from '../utils/role-summary.util';
import { maskIdentityValue } from '../utils/mask-identity.util';
import {
  CurrentUserBasicsReadModel,
  CurrentUserProfileLinksReadModel,
  CurrentUserReadModel,
  CurrentUserSecurityStateReadModel,
} from '../types/current-user-read.types';

/**
 * Users Module mapper converts persistence-focused projections into frontend-safe response models.
 * This keeps controllers thin and prevents raw database shapes from leaking out of the module.
 */
@Injectable()
export class CurrentUserMapper {
  toReadModel(input: {
    basics: CurrentUserBasicsReadModel;
    roles: AppRole[];
    profileLinks: CurrentUserProfileLinksReadModel;
    authenticatedUser: AuthenticatedUser;
    avatarUrl: string | null;
    avatarDataUrl: string | null;
  }): CurrentUserReadModel {
    return {
      userId: input.basics.id,
      displayName: input.basics.displayName,
      locale: input.basics.locale,
      avatarUrl: input.avatarUrl,
      avatarDataUrl: input.avatarDataUrl,
      accountStatus: input.basics.accountStatus,
      createdAt: input.basics.createdAt,
      identitySummary: {
        primaryEmail: input.basics.primaryEmail,
        primaryEmailMasked: maskIdentityValue(input.basics.primaryEmail),
        primaryPhone: input.basics.primaryPhone,
        primaryPhoneMasked: maskIdentityValue(input.basics.primaryPhone),
      },
      roles: buildRoleSummary(input.roles),
      securityState: this.toSecurityState(
        input.basics,
        input.authenticatedUser,
      ),
      profileLinks: input.profileLinks,
    };
  }

  mapRoles(roleRows: Array<{ role: UserRoleType }>): AppRole[] {
    const roles = roleRows
      .map((role) => this.mapUserRole(role.role))
      .filter((role): role is AppRole => role !== null);

    return normalizeAppRoles(roles);
  }

  toBasics(record: {
    id: string;
    displayName: string | null;
    defaultLocale: string | null;
    status: UserStatus;
    createdAt: Date;
    emails: Array<{ email: string; isPrimary: boolean; isVerified: boolean }>;
    phones: Array<{ phone: string; isPrimary: boolean; isVerified: boolean }>;
  }): CurrentUserBasicsReadModel {
    const primaryEmail = record.emails.find((email) => email.isPrimary) ?? null;
    const primaryPhone = record.phones.find((phone) => phone.isPrimary) ?? null;

    return {
      id: record.id,
      displayName: record.displayName,
      locale: record.defaultLocale,
      accountStatus: record.status,
      createdAt: record.createdAt,
      primaryEmail: primaryEmail?.email ?? null,
      isEmailVerified: primaryEmail?.isVerified ?? false,
      primaryPhone: primaryPhone?.phone ?? null,
      isPhoneVerified: primaryPhone?.isVerified ?? false,
    };
  }

  toProfileLinks(input: {
    patientProfile: { id: string } | null;
    practitionerProfile: {
      id: string;
      status: CurrentUserProfileLinksReadModel['practitionerStateSummary'];
    } | null;
  }): CurrentUserProfileLinksReadModel {
    return {
      patientProfileId: input.patientProfile?.id ?? null,
      practitionerProfileId: input.practitionerProfile?.id ?? null,
      practitionerStateSummary: input.practitionerProfile?.status ?? null,
    };
  }

  private toSecurityState(
    basics: CurrentUserBasicsReadModel,
    authenticatedUser: AuthenticatedUser,
  ): CurrentUserSecurityStateReadModel {
    return {
      accountStatus: basics.accountStatus,
      isActive: basics.accountStatus === UserStatus.ACTIVE,
      isEmailVerified: basics.isEmailVerified,
      isPhoneVerified: basics.isPhoneVerified,
      hasPractitionerOtpVerifiedSession:
        authenticatedUser.roles.includes(AppRole.PRACTITIONER) &&
        authenticatedUser.isPractitionerOtpVerified === true,
    };
  }

  private mapUserRole(role: UserRoleType): AppRole | null {
    switch (role) {
      case UserRoleType.SUPER_ADMIN:
        return AppRole.SUPER_ADMIN;
      case UserRoleType.ADMIN:
        return AppRole.ADMIN;
      case UserRoleType.FINANCE_STAFF:
        return AppRole.FINANCE_STAFF;
      case UserRoleType.MARKETING_STAFF:
        return AppRole.MARKETING_STAFF;
      case UserRoleType.PRACTITIONER_REVIEWER:
        return AppRole.PRACTITIONER_REVIEWER;
      case UserRoleType.PATIENT_OPERATIONS:
        return AppRole.PATIENT_OPERATIONS;
      case UserRoleType.SUPPORT:
        return AppRole.SUPPORT_AGENT;
      case UserRoleType.CONTENT_REVIEWER:
        return AppRole.CONTENT_REVIEWER;
      case UserRoleType.PATIENT:
        return AppRole.PATIENT;
      case UserRoleType.PRACTITIONER:
        return AppRole.PRACTITIONER;
      default:
        return null;
    }
  }
}
