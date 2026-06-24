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
