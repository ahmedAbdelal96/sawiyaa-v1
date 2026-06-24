import { ApiProperty } from '@nestjs/swagger';

export class PatientHomePractitionerItemResponseDto {
  @ApiProperty()
  practitionerId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  primarySpecialty!: string | null;

  @ApiProperty({ nullable: true })
  averageRating!: number | null;

  @ApiProperty()
  totalReviews!: number;

  @ApiProperty({ nullable: true })
  displaySessionPrice30!: number | null;

  @ApiProperty({ nullable: true })
  displaySessionPrice60!: number | null;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty({ required: false, nullable: true })
  bookingCountToday?: number | null;

  @ApiProperty()
  lastViewedAt?: string;

  @ApiProperty({ required: false, nullable: true })
  badgeLabel?: string;
}

export class PatientHomePractitionerModuleResponseDto {
  @ApiProperty()
  label!: string;

  @ApiProperty({ type: PatientHomePractitionerItemResponseDto, isArray: true })
  items!: PatientHomePractitionerItemResponseDto[];

  @ApiProperty({ required: false, nullable: true })
  status?: 'READY' | 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
}

export class PatientHomeCtaCardResponseDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  ctaKey!: 'MATCHING_INTRO' | 'SUPPORT_HOME';
}

export class PatientHomeDataResponseDto {
  @ApiProperty({ type: PatientHomePractitionerModuleResponseDto })
  featuredPractitioners!: PatientHomePractitionerModuleResponseDto;

  @ApiProperty({ type: PatientHomePractitionerModuleResponseDto })
  recentlyVisitedPractitioners!: PatientHomePractitionerModuleResponseDto;

  @ApiProperty({ type: PatientHomePractitionerModuleResponseDto })
  mostBookedTodayPractitioners!: PatientHomePractitionerModuleResponseDto;

  @ApiProperty({ type: PatientHomePractitionerModuleResponseDto })
  topRatedPractitioners!: PatientHomePractitionerModuleResponseDto;

  @ApiProperty({ type: PatientHomeCtaCardResponseDto })
  matchingCard!: PatientHomeCtaCardResponseDto;

  @ApiProperty({ type: PatientHomeCtaCardResponseDto })
  supportCard!: PatientHomeCtaCardResponseDto;
}

export class PatientHomeSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientHomeDataResponseDto })
  data!: PatientHomeDataResponseDto;
}

export class TrackPatientPractitionerViewSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  data!: {
    slug: string;
    trackedAt: string;
  };
}
