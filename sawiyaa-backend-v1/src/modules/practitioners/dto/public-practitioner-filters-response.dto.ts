import { ApiProperty } from '@nestjs/swagger';

export class PublicPractitionerFilterCategoryOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;
}

export class PublicPractitionerFilterSpecialtyOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    type: PublicPractitionerFilterCategoryOptionDto,
    nullable: true,
  })
  category!: PublicPractitionerFilterCategoryOptionDto | null;

  @ApiProperty()
  practitionerCount!: number;
}

export class PublicPractitionerFilterCountOptionDto {
  @ApiProperty()
  value!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  practitionerCount!: number;
}

export class PublicPractitionerFilterCountNumberOptionDto {
  @ApiProperty()
  value!: number;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  practitionerCount!: number;
}

export class PublicPractitionerRatingThresholdOptionDto {
  @ApiProperty()
  value!: number;

  @ApiProperty()
  label!: string;
}

export class PublicPractitionerFeeBoundsDto {
  @ApiProperty()
  min!: number;

  @ApiProperty()
  max!: number;

  @ApiProperty({ enum: ['EGP', 'USD'] })
  currency!: 'EGP' | 'USD';

  @ApiProperty()
  step!: number;
}

export class PublicPractitionerAvailabilitySupportDto {
  @ApiProperty({ example: true })
  onlineNowSupported!: true;

  @ApiProperty({ example: false })
  availableTodaySupported!: false;

  @ApiProperty({ example: false })
  availableThisWeekSupported!: false;
}

export class PublicPractitionerFiltersResponseDto {
  @ApiProperty({
    type: PublicPractitionerFilterSpecialtyOptionDto,
    isArray: true,
  })
  specialties!: PublicPractitionerFilterSpecialtyOptionDto[];

  @ApiProperty({
    type: PublicPractitionerFilterCountOptionDto,
    isArray: true,
  })
  specialtyCategories!: PublicPractitionerFilterCountOptionDto[];

  @ApiProperty({
    type: PublicPractitionerFilterCountOptionDto,
    isArray: true,
  })
  languages!: PublicPractitionerFilterCountOptionDto[];

  @ApiProperty({
    type: PublicPractitionerFilterCountOptionDto,
    isArray: true,
  })
  countries!: PublicPractitionerFilterCountOptionDto[];

  @ApiProperty({
    type: PublicPractitionerFilterCountOptionDto,
    isArray: true,
  })
  practitionerKinds!: PublicPractitionerFilterCountOptionDto[];

  @ApiProperty({
    type: PublicPractitionerFilterCountOptionDto,
    isArray: true,
  })
  genders!: PublicPractitionerFilterCountOptionDto[];

  @ApiProperty({
    type: PublicPractitionerFilterCountNumberOptionDto,
    isArray: true,
  })
  durations!: PublicPractitionerFilterCountNumberOptionDto[];

  @ApiProperty({
    type: PublicPractitionerRatingThresholdOptionDto,
    isArray: true,
  })
  ratingThresholds!: PublicPractitionerRatingThresholdOptionDto[];

  @ApiProperty({ type: PublicPractitionerFeeBoundsDto })
  feeBounds!: PublicPractitionerFeeBoundsDto;

  @ApiProperty({ type: PublicPractitionerAvailabilitySupportDto })
  availability!: PublicPractitionerAvailabilitySupportDto;
}

export class PublicPractitionerFiltersSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerFiltersResponseDto })
  data!: PublicPractitionerFiltersResponseDto;
}
