import { ApiProperty } from '@nestjs/swagger';
import { AppRole } from '@common/enums/app-role.enum';
import { PractitionerStatus, UserStatus } from '@prisma/client';

export class AuthenticatedUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ enum: AppRole, isArray: true })
  roles!: AppRole[];

  @ApiProperty({ nullable: true })
  primaryEmail!: string | null;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty({ nullable: true })
  primaryPhone!: string | null;

  @ApiProperty()
  isPhoneVerified!: boolean;

  @ApiProperty({ nullable: true })
  practitionerProfileId!: string | null;

  @ApiProperty({ enum: PractitionerStatus, nullable: true })
  practitionerStatus!: PractitionerStatus | null;
}

export class CurrentAuthUserResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: AppRole, isArray: true })
  roles!: AppRole[];

  @ApiProperty({ nullable: true })
  sessionId!: string | null;

  @ApiProperty({ enum: ['access', 'refresh'], nullable: true })
  authMethod!: 'access' | 'refresh' | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty()
  isPhoneVerified!: boolean;

  @ApiProperty({ nullable: true })
  practitionerProfileId!: string | null;

  @ApiProperty()
  isPractitionerOtpVerified!: boolean;

  @ApiProperty()
  isPractitionerApproved!: boolean;

  @ApiProperty({ isArray: true, type: String })
  featureFlags!: string[];
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  accessTokenExpiresAt!: Date;

  @ApiProperty()
  refreshTokenExpiresAt!: Date;
}

export class AuthSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: AuthTokensResponseDto })
  tokens!: AuthTokensResponseDto;

  @ApiProperty({ type: AuthenticatedUserResponseDto })
  user!: AuthenticatedUserResponseDto;
}

export class OtpChallengeResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  challengeId!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty()
  maskedTarget!: string;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  requiresOtpVerification!: boolean;
}

export class PractitionerRegistrationResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  requiresOtpOnLogin!: boolean;
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}

export class PasswordResetRequestedResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ required: false, example: 'VERIFY_OTP' })
  nextStep?: string;

  @ApiProperty({ required: false })
  cooldownSeconds?: number;

  @ApiProperty({ required: false })
  resendAvailableAt?: string;
}

export class PasswordResetOtpVerifiedResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  resetToken!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ example: 'SET_NEW_PASSWORD' })
  nextStep!: string;
}

export class AuthSuccessEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AuthSuccessResponseDto })
  data!: AuthSuccessResponseDto;
}

export class CurrentAuthUserEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CurrentAuthUserResponseDto })
  data!: CurrentAuthUserResponseDto;
}

export class OtpChallengeEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: OtpChallengeResponseDto })
  data!: OtpChallengeResponseDto;
}

export class PractitionerRegistrationEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PractitionerRegistrationResponseDto })
  data!: PractitionerRegistrationResponseDto;
}

export class MessageEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: MessageResponseDto })
  data!: MessageResponseDto;
}

export class PasswordResetOtpVerifiedEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PasswordResetOtpVerifiedResponseDto })
  data!: PasswordResetOtpVerifiedResponseDto;
}
