import { ApiProperty } from '@nestjs/swagger';

export class PatientProfileResponseDto {
  @ApiProperty()
  patientProfileId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  avatarDataUrl!: string | null;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  dateOfBirth!: Date | null;

  @ApiProperty({ nullable: true })
  gender!: string | null;

  @ApiProperty({ nullable: true })
  locale!: string | null;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty()
  isOnboardingCompleted!: boolean;

  @ApiProperty({ nullable: true })
  onboardingCompletedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PatientProfileSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PatientProfileResponseDto })
  profile!: PatientProfileResponseDto;
}
