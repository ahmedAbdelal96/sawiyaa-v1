import { ApiProperty } from '@nestjs/swagger';
import { AppRole } from '@common/enums/app-role.enum';
import { PractitionerStatus, UserStatus } from '@prisma/client';

export class CurrentUserIdentitySummaryDto {
  @ApiProperty({ nullable: true })
  primaryEmail!: string | null;

  @ApiProperty({ nullable: true })
  primaryEmailMasked!: string | null;

  @ApiProperty({ nullable: true })
  primaryPhone!: string | null;

  @ApiProperty({ nullable: true })
  primaryPhoneMasked!: string | null;
}

export class CurrentUserRoleSummaryDto {
  @ApiProperty({ enum: AppRole, isArray: true })
  roles!: AppRole[];

  @ApiProperty()
  hasPatientRole!: boolean;

  @ApiProperty()
  hasPractitionerRole!: boolean;

  @ApiProperty()
  hasAdminRole!: boolean;

  @ApiProperty()
  hasSupportAgentRole!: boolean;

  @ApiProperty()
  hasContentReviewerRole!: boolean;
}

export class CurrentUserSecurityStateDto {
  @ApiProperty({ enum: UserStatus })
  accountStatus!: UserStatus;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty()
  isPhoneVerified!: boolean;

  @ApiProperty({
    description:
      'True only when the current authenticated session represents a practitioner access context that already passed the OTP gate.',
  })
  hasPractitionerOtpVerifiedSession!: boolean;
}

export class CurrentUserProfileLinksDto {
  @ApiProperty({ nullable: true })
  patientProfileId!: string | null;

  @ApiProperty({ nullable: true })
  practitionerProfileId!: string | null;

  @ApiProperty({ enum: PractitionerStatus, nullable: true })
  practitionerStateSummary!: PractitionerStatus | null;
}

export class CurrentUserSummaryResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  locale!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  avatarDataUrl!: string | null;

  @ApiProperty({ enum: UserStatus })
  accountStatus!: UserStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: CurrentUserIdentitySummaryDto })
  identitySummary!: CurrentUserIdentitySummaryDto;

  @ApiProperty({ type: CurrentUserRoleSummaryDto })
  roles!: CurrentUserRoleSummaryDto;

  @ApiProperty({ type: CurrentUserSecurityStateDto })
  securityState!: CurrentUserSecurityStateDto;

  @ApiProperty({ type: CurrentUserProfileLinksDto })
  profileLinks!: CurrentUserProfileLinksDto;
}

export class CurrentUserSummaryEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CurrentUserSummaryResponseDto })
  data!: CurrentUserSummaryResponseDto;
}
