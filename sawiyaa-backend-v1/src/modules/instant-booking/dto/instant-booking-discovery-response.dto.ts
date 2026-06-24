import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InstantBookingEligiblePractitionerPricingDto {
  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: {
      type: 'string',
    },
    description: 'Currency-specific instant prices keyed by duration (30/60).',
  })
  EGP?: Record<string, string>;

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: {
      type: 'string',
    },
    description: 'Currency-specific instant prices keyed by duration (30/60).',
  })
  USD?: Record<string, string>;
}

export class InstantBookingEligiblePractitionerItemDto {
  @ApiProperty()
  practitionerId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  primarySpecialty!: string | null;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty()
  isOnline!: boolean;

  @ApiProperty()
  availableNow!: boolean;

  @ApiProperty()
  instantBookingEnabled!: boolean;

  @ApiProperty()
  earliestStartAt!: string;

  @ApiProperty()
  currentWindowEndsAt!: string;

  @ApiProperty({ type: [Number] })
  supportedDurations!: number[];

  @ApiProperty({ type: InstantBookingEligiblePractitionerPricingDto })
  instantBookingPricing!: InstantBookingEligiblePractitionerPricingDto;

  @ApiProperty({ nullable: true })
  shortBio!: string | null;

  @ApiProperty({ nullable: true })
  rating!: number | null;

  @ApiProperty({ nullable: true })
  completedSessionsCount!: number | null;
}

export class InstantBookingEligiblePractitionersMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty()
  generatedAt!: string;
}

export class InstantBookingEligiblePractitionersDataDto {
  @ApiProperty({ type: InstantBookingEligiblePractitionerItemDto, isArray: true })
  items!: InstantBookingEligiblePractitionerItemDto[];

  @ApiProperty({ type: InstantBookingEligiblePractitionersMetaDto })
  meta!: InstantBookingEligiblePractitionersMetaDto;
}

export class InstantBookingEligiblePractitionersSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: InstantBookingEligiblePractitionersDataDto })
  data!: InstantBookingEligiblePractitionersDataDto;
}
