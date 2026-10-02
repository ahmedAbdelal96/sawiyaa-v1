import { ApiProperty } from '@nestjs/swagger';
import { SessionMode, SessionStatus } from '@prisma/client';

export class PackagePurchaseLinkedSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionCode!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

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

  @ApiProperty({
    description:
      'Authoritative package progress. A reserved session is already linked to an appointment or awaiting an outcome.',
  })
  progress!: {
    totalSessions: number;
    consumedSessions: number;
    completedSessions: number;
    reservedSessions: number;
    availableSessions: number;
    remainingSessions: number;
    scheduledSessions: number;
    progressPercent: number;
    nextSessionStartAt: string | null;
  };

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

  @ApiProperty({ nullable: true, description: 'Patient-safe payment lifecycle and refund history.' })
  payment!: Record<string, unknown> | null;

  @ApiProperty({ type: [Object], description: 'Patient-safe package entitlement decisions.' })
  entitlementHistory!: Record<string, unknown>[];
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
