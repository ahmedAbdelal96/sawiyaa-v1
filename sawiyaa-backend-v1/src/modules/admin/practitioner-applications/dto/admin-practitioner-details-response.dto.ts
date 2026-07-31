import { ApiProperty } from '@nestjs/swagger';
import {
  CredentialType,
  CredentialReviewStatus,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerStatus,
  PractitionerType,
  UserStatus,
} from '@prisma/client';

export class AdminPricingQuoteResponseDto {
  @ApiProperty({ nullable: true })
  egp!: number | null;

  @ApiProperty({ nullable: true })
  usd!: number | null;
}

export class AdminPractitionerPricingResponseDto {
  @ApiProperty({ type: AdminPricingQuoteResponseDto })
  session30!: AdminPricingQuoteResponseDto;

  @ApiProperty({ type: AdminPricingQuoteResponseDto })
  session60!: AdminPricingQuoteResponseDto;
}

export class AdminPractitionerSpecialtyResponseDto {
  @ApiProperty()
  specialtyId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty({ nullable: true })
  category!: {
    id: string;
    slug: string;
    name: string;
  } | null;
}

export class AdminPractitionerCredentialResponseDto {
  @ApiProperty()
  credentialId!: string;

  @ApiProperty({ enum: CredentialType })
  credentialType!: CredentialType;

  @ApiProperty({ enum: CredentialReviewStatus })
  reviewStatus!: CredentialReviewStatus;

  @ApiProperty({ nullable: true })
  expiresAt!: Date | null;

  @ApiProperty()
  uploadedAt!: Date;

  @ApiProperty({ nullable: true })
  reviewNotes!: string | null;
}

export class AdminPractitionerPayoutResponseDto {
  @ApiProperty({ enum: PractitionerPayoutMethodType })
  methodType!: PractitionerPayoutMethodType;

  @ApiProperty({ nullable: true })
  accountHolderName!: string | null;

  @ApiProperty({ nullable: true })
  bankName!: string | null;

  @ApiProperty({ nullable: true })
  bankAccountNumber!: string | null;

  @ApiProperty({ nullable: true })
  iban!: string | null;

  @ApiProperty({ nullable: true })
  walletProvider!: string | null;

  @ApiProperty({ nullable: true })
  walletIdentifier!: string | null;

  @ApiProperty({ nullable: true })
  otherDetails!: string | null;
}

export class AdminPractitionerApplicationSummaryResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: PractitionerApplicationStatus })
  status!: PractitionerApplicationStatus;

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

export class AdminPractitionerOperationsResponseDto {
  @ApiProperty()
  totalSessions!: number;

  @ApiProperty()
  completedSessions!: number;

  @ApiProperty()
  upcomingSessions!: number;

  @ApiProperty()
  cancelledSessions!: number;
}

export class AdminPractitionerAuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  typeSlug!: string;

  @ApiProperty()
  eventFamily!: string;

  @ApiProperty({ nullable: true })
  titleSnapshot!: string | null;

  @ApiProperty({ nullable: true })
  bodySnapshot!: string | null;

  @ApiProperty()
  occurredAt!: Date;

  @ApiProperty({ nullable: true })
  actorDisplayName!: string | null;
}

export class AdminPractitionerDetailsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  publicSlug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ enum: UserStatus })
  accountStatus!: UserStatus;

  @ApiProperty({ enum: PractitionerStatus })
  profileStatus!: PractitionerStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty({ nullable: true })
  countryName!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty({ nullable: true })
  defaultLocale!: string | null;

  @ApiProperty({ enum: PractitionerType })
  practitionerType!: PractitionerType;

  @ApiProperty({ enum: PractitionerGender, nullable: true })
  practitionerGender!: PractitionerGender | null;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({ nullable: true })
  yearsOfExperience!: number | null;

  @ApiProperty({ type: [String] })
  languages!: string[];

  @ApiProperty()
  acceptsPackages!: boolean;

  @ApiProperty()
  isInstantBookingEnabled!: boolean;

  @ApiProperty({ type: AdminPractitionerPricingResponseDto })
  pricing!: AdminPractitionerPricingResponseDto;

  @ApiProperty({ type: [AdminPractitionerSpecialtyResponseDto] })
  specialties!: AdminPractitionerSpecialtyResponseDto[];

  @ApiProperty({ type: [AdminPractitionerCredentialResponseDto] })
  credentials!: AdminPractitionerCredentialResponseDto[];

  @ApiProperty({ type: AdminPractitionerPayoutResponseDto, nullable: true })
  payoutDestination!: AdminPractitionerPayoutResponseDto | null;

  @ApiProperty({ type: AdminPractitionerApplicationSummaryResponseDto, nullable: true })
  application!: AdminPractitionerApplicationSummaryResponseDto | null;

  @ApiProperty({ type: AdminPractitionerOperationsResponseDto })
  operations!: AdminPractitionerOperationsResponseDto;

  @ApiProperty({ type: [AdminPractitionerAuditLogResponseDto] })
  auditLogs!: AdminPractitionerAuditLogResponseDto[];
}

export class AdminPractitionerDetailsSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: AdminPractitionerDetailsResponseDto })
  details!: AdminPractitionerDetailsResponseDto;
}
