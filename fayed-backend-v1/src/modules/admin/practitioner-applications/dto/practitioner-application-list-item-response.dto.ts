import { ApiProperty } from '@nestjs/swagger';
import {
  CredentialReviewStatus,
  CredentialType,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerStatus,
  PractitionerType,
  UserStatus,
} from '@prisma/client';

export class AdminSpecialtySummaryResponseDto {
  @ApiProperty()
  specialtyId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;
}

export class AdminProfileSpecialtyResponseDto extends AdminSpecialtySummaryResponseDto {
  @ApiProperty()
  isPrimary!: boolean;
}

export class PractitionerApplicationListItemResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  practitionerProfileId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: PractitionerType })
  practitionerType!: PractitionerType;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty({ type: AdminSpecialtySummaryResponseDto, nullable: true })
  mainSpecialty!: AdminSpecialtySummaryResponseDto | null;

  @ApiProperty({ enum: PractitionerApplicationStatus })
  applicationStatus!: PractitionerApplicationStatus;

  @ApiProperty({ nullable: true })
  submittedAt!: Date | null;

  @ApiProperty()
  updatedAt!: Date;
}

export class PractitionerApplicationListPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class PractitionerApplicationListSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({
    type: PractitionerApplicationListItemResponseDto,
    isArray: true,
  })
  applications!: PractitionerApplicationListItemResponseDto[];

  @ApiProperty({ type: PractitionerApplicationListPaginationResponseDto })
  pagination!: PractitionerApplicationListPaginationResponseDto;
}

export class AdminApplicantEmailSummaryResponseDto {
  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty()
  isVerified!: boolean;
}

export class AdminApplicantPhoneSummaryResponseDto {
  @ApiProperty({ nullable: true })
  number!: string | null;

  @ApiProperty()
  isVerified!: boolean;
}

export class AdminApplicantBasicsResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  practitionerProfileId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: UserStatus })
  accountStatus!: UserStatus;

  @ApiProperty({ type: AdminApplicantEmailSummaryResponseDto })
  email!: AdminApplicantEmailSummaryResponseDto;

  @ApiProperty({ type: AdminApplicantPhoneSummaryResponseDto })
  phone!: AdminApplicantPhoneSummaryResponseDto;

  @ApiProperty({ nullable: true })
  locale!: string | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;
}

export class AdminPractitionerProfileSectionResponseDto {
  @ApiProperty({ enum: PractitionerType })
  practitionerType!: PractitionerType;

  @ApiProperty({ enum: PractitionerGender, nullable: true })
  practitionerGender!: PractitionerGender | null;

  @ApiProperty({ enum: PractitionerStatus })
  profileStatus!: PractitionerStatus;

  @ApiProperty({ nullable: true })
  professionalTitle!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({ nullable: true })
  yearsOfExperience!: number | null;

  @ApiProperty({ nullable: true })
  primarySpecialtyCategoryId!: string | null;

  @ApiProperty({ type: [String] })
  languages!: string[];

  @ApiProperty({ type: AdminProfileSpecialtyResponseDto, isArray: true })
  specialties!: AdminProfileSpecialtyResponseDto[];
}

export class AdminPractitionerCredentialResponseDto {
  @ApiProperty()
  credentialId!: string;

  @ApiProperty({ enum: CredentialType })
  credentialType!: CredentialType;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty({ enum: CredentialReviewStatus })
  reviewStatus!: CredentialReviewStatus;

  @ApiProperty({ nullable: true })
  expiresAt!: Date | null;

  @ApiProperty()
  uploadedAt!: Date;

  @ApiProperty({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ nullable: true })
  reviewedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  reviewNotes!: string | null;
}

export class AdminPractitionerPayoutDestinationResponseDto {
  @ApiProperty({ enum: PractitionerPayoutMethodType, nullable: true })
  methodType!: PractitionerPayoutMethodType | null;

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

export class AdminReadinessSnapshotResponseDto {
  @ApiProperty()
  isProfileCompleted!: boolean;

  @ApiProperty()
  hasRequiredSpecialties!: boolean;

  @ApiProperty()
  hasRequiredCredentials!: boolean;

  @ApiProperty()
  hasPayoutDestination!: boolean;

  @ApiProperty()
  canBeReviewed!: boolean;

  @ApiProperty()
  canBeApproved!: boolean;
}

export class PractitionerApplicationDetailsResponseDto {
  @ApiProperty({ type: AdminApplicantBasicsResponseDto })
  applicant!: AdminApplicantBasicsResponseDto;

  @ApiProperty({ type: AdminPractitionerProfileSectionResponseDto })
  profile!: AdminPractitionerProfileSectionResponseDto;

  @ApiProperty({ type: AdminPractitionerCredentialResponseDto, isArray: true })
  credentials!: AdminPractitionerCredentialResponseDto[];

  @ApiProperty({
    type: AdminPractitionerPayoutDestinationResponseDto,
    nullable: true,
  })
  payoutDestination!: AdminPractitionerPayoutDestinationResponseDto | null;

  @ApiProperty({ type: AdminPractitionerApplicationSummaryResponseDto })
  application!: AdminPractitionerApplicationSummaryResponseDto;

  @ApiProperty({ type: AdminReadinessSnapshotResponseDto })
  readinessSnapshot!: AdminReadinessSnapshotResponseDto;
}

export class PractitionerApplicationDetailsSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerApplicationDetailsResponseDto })
  details!: PractitionerApplicationDetailsResponseDto;
}

export class PractitionerApplicationDecisionResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  practitionerProfileId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: PractitionerApplicationStatus })
  status!: PractitionerApplicationStatus;

  @ApiProperty({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ nullable: true })
  reviewedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  reviewDecisionReason!: string | null;

  @ApiProperty({ nullable: true })
  reviewNotes!: string | null;
}

export class PractitionerApplicationDecisionSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerApplicationDecisionResponseDto })
  application!: PractitionerApplicationDecisionResponseDto;
}
