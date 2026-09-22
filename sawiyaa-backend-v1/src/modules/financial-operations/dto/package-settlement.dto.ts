import { ApiProperty } from '@nestjs/swagger';
import {
  PackageSettlementStatus,
  PatientPackagePurchaseStatus,
} from '@prisma/client';
import { PaginationDto } from './financial-operations-response.dto';

export class PackageSettlementItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  purchaseId!: string;

  @ApiProperty({ enum: PatientPackagePurchaseStatus })
  purchaseStatus!: PatientPackagePurchaseStatus;

  @ApiProperty()
  practitionerId!: string;

  @ApiProperty({ nullable: true })
  practitionerDisplayName!: string | null;

  @ApiProperty({ nullable: true })
  practitionerSlug!: string | null;

  @ApiProperty()
  patientId!: string;

  @ApiProperty({ nullable: true })
  patientDisplayName!: string | null;

  @ApiProperty({ nullable: true })
  packagePlanCode!: string | null;

  @ApiProperty({ nullable: true })
  packagePlanTitle!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: PackageSettlementStatus })
  status!: PackageSettlementStatus;

  @ApiProperty()
  sessionCount!: number;

  @ApiProperty()
  completedSessionsCount!: number;

  @ApiProperty()
  heldPractitionerAmount!: string;

  @ApiProperty()
  heldPlatformAmount!: string;

  @ApiProperty()
  releasablePractitionerAmount!: string;

  @ApiProperty()
  releasedPractitionerAmount!: string;

  @ApiProperty()
  normalEquivalentUsedAmount!: string;

  @ApiProperty()
  discountAppliedAmount!: string;

  @ApiProperty()
  availableSessions!: number;

  @ApiProperty()
  reservedSessions!: number;

  @ApiProperty()
  consumedSessions!: number;

  @ApiProperty({ nullable: true })
  nextSessionStartAt!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  payment!: {
    id: string;
    status: string;
    provider: string;
    reference: string | null;
    amount: string;
    currency: string;
    capturedAt: string | null;
  } | null;

  @ApiProperty({ type: Object, isArray: true })
  sessions!: Array<{
    id: string;
    sessionCode: string;
    status: string;
    packageSessionIndex: number | null;
    packageSessionCount: number | null;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    paymentCoverageType: string;
    entitlementDecision: {
      decisionType: string;
      reasonCode: string;
      decidedAt: string;
    } | null;
  }>;

  @ApiProperty({ nullable: true })
  reviewedAt!: string | null;

  @ApiProperty({ nullable: true })
  reviewedByAdminId!: string | null;

  @ApiProperty({ nullable: true })
  releasedAt!: string | null;

  @ApiProperty({ nullable: true })
  releasedByAdminId!: string | null;

  @ApiProperty({ nullable: true })
  decision!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PackageSettlementDetailsDto extends PackageSettlementItemDto {}

export class PackageSettlementListResponseDto {
  @ApiProperty({ type: PackageSettlementItemDto, isArray: true })
  items!: PackageSettlementItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination!: PaginationDto;
}

export class PackageSettlementSuccessResponseDto {
  @ApiProperty({ type: PackageSettlementDetailsDto })
  item!: PackageSettlementDetailsDto;
}
