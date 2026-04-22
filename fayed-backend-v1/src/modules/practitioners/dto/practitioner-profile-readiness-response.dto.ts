import { ApiProperty } from '@nestjs/swagger';

export class PractitionerReadinessChecksResponseDto {
  @ApiProperty()
  hasDisplayName!: boolean;

  @ApiProperty()
  hasProfessionalTitle!: boolean;

  @ApiProperty()
  hasBio!: boolean;

  @ApiProperty()
  hasCountry!: boolean;

  @ApiProperty()
  hasYearsOfExperience!: boolean;

  @ApiProperty()
  hasLanguage!: boolean;

  @ApiProperty()
  hasSpecialty!: boolean;

  @ApiProperty()
  hasCredential!: boolean;

  @ApiProperty()
  isAccountActive!: boolean;

  @ApiProperty()
  isPractitionerOtpVerified!: boolean;
}

export class PractitionerProfileReadinessResponseDto {
  @ApiProperty()
  isProfileCompleted!: boolean;

  @ApiProperty()
  canSubmitApplication!: boolean;

  @ApiProperty({ type: [String] })
  missingRequirements!: string[];

  @ApiProperty({ type: PractitionerReadinessChecksResponseDto })
  checks!: PractitionerReadinessChecksResponseDto;
}

export class PractitionerProfileReadinessSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerProfileReadinessResponseDto })
  readiness!: PractitionerProfileReadinessResponseDto;
}
