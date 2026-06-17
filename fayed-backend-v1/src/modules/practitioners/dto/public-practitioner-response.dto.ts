import { ApiProperty } from '@nestjs/swagger';

export class PublicPractitionerPricingCurrencyResponseDto {
  @ApiProperty({ nullable: true })
  egp!: number | null;

  @ApiProperty({ nullable: true })
  usd!: number | null;
}

export class PublicPractitionerPricingResponseDto {
  @ApiProperty({ type: PublicPractitionerPricingCurrencyResponseDto })
  session30!: PublicPractitionerPricingCurrencyResponseDto;

  @ApiProperty({ type: PublicPractitionerPricingCurrencyResponseDto })
  session60!: PublicPractitionerPricingCurrencyResponseDto;
}

export class PublicPractitionerSpecialtyResponseDto {
  @ApiProperty()
  specialtyId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty()
  isPrimary!: boolean;
}

export class PublicPractitionerRatingSummaryResponseDto {
  @ApiProperty({ nullable: true })
  averageRating!: number | null;

  @ApiProperty()
  totalReviews!: number;
}

export class PublicPractitionerCredentialsSummaryResponseDto {
  @ApiProperty()
  totalCredentials!: number;

  @ApiProperty()
  approvedCredentials!: number;
}

export class PublicPractitionerListItemResponseDto {
  @ApiProperty({
    description:
      'SEO-friendly stable public identifier used by frontend route: /practitioners/[slug]',
  })
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  bioSnippet!: string | null;

  @ApiProperty({ type: PublicPractitionerSpecialtyResponseDto, isArray: true })
  specialties!: PublicPractitionerSpecialtyResponseDto[];

  @ApiProperty({ type: [String] })
  languages!: string[];

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ nullable: true })
  regionalPricingMode!: string | null;

  @ApiProperty({ nullable: true })
  resolvedCountryIsoCode!: string | null;

  @ApiProperty()
  practitionerType!: string;

  @ApiProperty({ nullable: true })
  practitionerGender!: string | null;

  @ApiProperty({ type: PublicPractitionerPricingResponseDto })
  pricing!: PublicPractitionerPricingResponseDto;

  @ApiProperty({ nullable: true })
  sessionPrice30!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice60!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice30Egp!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice30Usd!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice60Egp!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice60Usd!: number | null;

  @ApiProperty({ nullable: true })
  instantBookingPrice30Egp!: number | null;

  @ApiProperty({ nullable: true })
  instantBookingPrice30Usd!: number | null;

  @ApiProperty({ nullable: true })
  instantBookingPrice60Egp!: number | null;

  @ApiProperty({ nullable: true })
  instantBookingPrice60Usd!: number | null;

  @ApiProperty({ nullable: true })
  displaySessionPrice30!: number | null;

  @ApiProperty({ nullable: true })
  displaySessionPrice60!: number | null;

  @ApiProperty()
  isOnlineNow!: boolean;

  @ApiProperty()
  acceptsCoupon!: boolean;

  @ApiProperty()
  acceptsPackage!: boolean;

  @ApiProperty({ nullable: true })
  yearsExperience!: number | null;

  @ApiProperty({ type: PublicPractitionerRatingSummaryResponseDto })
  ratingSummary!: PublicPractitionerRatingSummaryResponseDto;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty()
  isVerified!: boolean;
}

export class PublicPractitionerDetailsResponseDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  fullBio!: string | null;

  @ApiProperty({ type: PublicPractitionerSpecialtyResponseDto, isArray: true })
  specialties!: PublicPractitionerSpecialtyResponseDto[];

  @ApiProperty({ type: [String] })
  languages!: string[];

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ nullable: true })
  regionalPricingMode!: string | null;

  @ApiProperty({ nullable: true })
  resolvedCountryIsoCode!: string | null;

  @ApiProperty({ nullable: true })
  yearsExperience!: number | null;

  @ApiProperty({ type: PublicPractitionerPricingResponseDto })
  pricing!: PublicPractitionerPricingResponseDto;

  @ApiProperty({ nullable: true })
  sessionPrice30!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice60!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice30Egp!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice30Usd!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice60Egp!: number | null;

  @ApiProperty({ nullable: true })
  sessionPrice60Usd!: number | null;

  @ApiProperty({ nullable: true })
  instantBookingPrice30Egp!: number | null;

  @ApiProperty({ nullable: true })
  instantBookingPrice30Usd!: number | null;

  @ApiProperty({ nullable: true })
  instantBookingPrice60Egp!: number | null;

  @ApiProperty({ nullable: true })
  instantBookingPrice60Usd!: number | null;

  @ApiProperty({ nullable: true })
  displaySessionPrice30!: number | null;

  @ApiProperty({ nullable: true })
  displaySessionPrice60!: number | null;

  @ApiProperty({ type: PublicPractitionerRatingSummaryResponseDto })
  ratingSummary!: PublicPractitionerRatingSummaryResponseDto;

  @ApiProperty({ type: PublicPractitionerCredentialsSummaryResponseDto })
  credentialsSummary!: PublicPractitionerCredentialsSummaryResponseDto;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}

export class PublicPractitionersPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PublicPractitionersListDataResponseDto {
  @ApiProperty({ type: PublicPractitionerListItemResponseDto, isArray: true })
  items!: PublicPractitionerListItemResponseDto[];

  @ApiProperty({ type: PublicPractitionersPaginationResponseDto })
  pagination!: PublicPractitionersPaginationResponseDto;
}

export class PublicPractitionerDetailsDataResponseDto {
  @ApiProperty({ type: PublicPractitionerDetailsResponseDto })
  item!: PublicPractitionerDetailsResponseDto;
}

export class PublicPractitionersListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionersListDataResponseDto })
  data!: PublicPractitionersListDataResponseDto;
}

export class PublicPractitionerDetailsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPractitionerDetailsDataResponseDto })
  data!: PublicPractitionerDetailsDataResponseDto;
}
