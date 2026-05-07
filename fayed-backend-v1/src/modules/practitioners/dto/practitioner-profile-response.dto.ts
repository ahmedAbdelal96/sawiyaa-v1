import { ApiProperty } from '@nestjs/swagger';
import {
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerStatus,
  PractitionerType,
} from '@prisma/client';
import { PractitionerPayoutDestinationResponseDto } from './practitioner-payout-destination.dto';

export class PractitionerPricingCurrencyResponseDto {
  @ApiProperty({ nullable: true })
  egp!: number | null;

  @ApiProperty({ nullable: true })
  usd!: number | null;
}

export class PractitionerPricingResponseDto {
  @ApiProperty({ type: PractitionerPricingCurrencyResponseDto })
  session30!: PractitionerPricingCurrencyResponseDto;

  @ApiProperty({ type: PractitionerPricingCurrencyResponseDto })
  session60!: PractitionerPricingCurrencyResponseDto;
}

export class PractitionerSpecialtyResponseDto {
  @ApiProperty()
  specialtyId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty()
  isPrimary!: boolean;
}

export class PractitionerCredentialSummaryResponseDto {
  @ApiProperty()
  totalCredentials!: number;

  @ApiProperty()
  pendingCount!: number;

  @ApiProperty()
  approvedCount!: number;

  @ApiProperty()
  rejectedCount!: number;

  @ApiProperty()
  expiredCount!: number;

  @ApiProperty({ nullable: true })
  lastUploadedAt!: Date | null;
}

export class PractitionerApplicationSummaryResponseDto {
  @ApiProperty({ nullable: true })
  applicationId!: string | null;

  @ApiProperty({ enum: PractitionerApplicationStatus, nullable: true })
  status!: PractitionerApplicationStatus | null;

  @ApiProperty({ nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ nullable: true })
  reviewedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  reviewDecisionReason!: string | null;

  @ApiProperty({ nullable: true })
  reviewNotes!: string | null;
}

export class PractitionerProfileResponseDto {
  @ApiProperty()
  practitionerProfileId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty({ nullable: true })
  locale!: string | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty({ type: [String] })
  languages!: string[];

  @ApiProperty({ nullable: true })
  yearsOfExperience!: number | null;

  @ApiProperty({ enum: PractitionerType })
  practitionerType!: PractitionerType;

  @ApiProperty({ enum: PractitionerGender, nullable: true })
  practitionerGender!: PractitionerGender | null;

  @ApiProperty({ nullable: true })
  primarySpecialtyCategoryId!: string | null;

  @ApiProperty()
  acceptsPackage!: boolean;

  @ApiProperty({ type: PractitionerPricingResponseDto })
  pricing!: PractitionerPricingResponseDto;

  @ApiProperty({
    type: PractitionerPayoutDestinationResponseDto,
    nullable: true,
  })
  payoutDestination!: PractitionerPayoutDestinationResponseDto | null;

  @ApiProperty({ enum: PractitionerStatus })
  profileStatus!: PractitionerStatus;

  @ApiProperty({ type: PractitionerSpecialtyResponseDto, isArray: true })
  specialties!: PractitionerSpecialtyResponseDto[];

  @ApiProperty()
  isProfileCompleted!: boolean;

  @ApiProperty()
  canSubmitApplication!: boolean;

  @ApiProperty({ type: PractitionerApplicationSummaryResponseDto })
  applicationStatusSummary!: PractitionerApplicationSummaryResponseDto;

  @ApiProperty({ type: PractitionerCredentialSummaryResponseDto })
  credentialSummary!: PractitionerCredentialSummaryResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PractitionerProfileSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerProfileResponseDto })
  profile!: PractitionerProfileResponseDto;
}

export class PractitionerSpecialtiesSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerSpecialtyResponseDto, isArray: true })
  specialties!: PractitionerSpecialtyResponseDto[];
}
