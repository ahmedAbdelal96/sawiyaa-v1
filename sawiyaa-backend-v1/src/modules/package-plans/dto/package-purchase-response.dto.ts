import { ApiProperty } from '@nestjs/swagger';
import { SessionMode, SessionStatus } from '@prisma/client';
import { SessionJoinAvailabilityDto } from '@modules/sessions/dto/session-response.dto';
import { SessionPresentationStatus } from '@modules/sessions/utils/session-join-policy.util';

export class PackagePurchaseLinkedSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionCode!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({
    enum: [
      'UPCOMING',
      'READY_TO_JOIN',
      'IN_PROGRESS',
      'AWAITING_COMPLETION_CONFIRMATION',
      'COMPLETED',
      'CANCELLED',
      'PATIENT_NO_SHOW',
      'PRACTITIONER_NO_SHOW',
      'BOTH_NO_SHOW',
      'EXPIRED',
    ],
  })
  presentationStatus!: SessionPresentationStatus;

  @ApiProperty({ type: SessionJoinAvailabilityDto })
  joinAvailability!: SessionJoinAvailabilityDto;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty()
  packageSessionIndex!: number;
}

export class PatientPackagePurchaseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  planCode!: string;

  @ApiProperty()
  sessionCount!: number;

  @ApiProperty()
  discountPercent!: string;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty()
  selectedCurrencyCode!: string;

  @ApiProperty({
    enum: ['EGYPT_LOCAL', 'INTERNATIONAL'],
  })
  regionalPricingMode!: 'EGYPT_LOCAL' | 'INTERNATIONAL';

  @ApiProperty({ nullable: true })
  resolvedCountryIsoCode!: string | null;

  @ApiProperty()
  selectedBaseSessionPrice!: string;

  @ApiProperty()
  undiscountedTotal!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  patientPayableTotal!: string;

  @ApiProperty({ nullable: true })
  paymentExpiresAt!: string | null;

  @ApiProperty({ type: [PackagePurchaseLinkedSessionResponseDto] })
  linkedSessions!: PackagePurchaseLinkedSessionResponseDto[];

  @ApiProperty()
  linkedSessionsCount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PatientPackagePurchasesPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PatientPackagePurchaseListDataDto {
  @ApiProperty({ type: [PatientPackagePurchaseResponseDto] })
  items!: PatientPackagePurchaseResponseDto[];

  @ApiProperty({ type: PatientPackagePurchasesPaginationResponseDto })
  pagination!: PatientPackagePurchasesPaginationResponseDto;
}

export class PatientPackagePurchaseItemDataDto {
  @ApiProperty({ type: PatientPackagePurchaseResponseDto })
  item!: PatientPackagePurchaseResponseDto;
}

export class PatientPackagePurchaseListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientPackagePurchaseListDataDto })
  data!: PatientPackagePurchaseListDataDto;
}

export class PatientPackagePurchaseItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientPackagePurchaseItemDataDto })
  data!: PatientPackagePurchaseItemDataDto;
}
