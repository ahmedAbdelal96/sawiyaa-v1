import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

class AdminSessionPackageEntitlementDecisionActorDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class AdminSessionPackageEntitlementDecisionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  packagePurchaseId!: string;

  @ApiProperty({ enum: SessionStatus })
  sessionStatusSnapshot!: SessionStatus;

  @ApiProperty()
  decisionType!: string;

  @ApiProperty()
  reasonCode!: string;

  @ApiProperty({ nullable: true })
  adminNote!: string | null;

  @ApiProperty({ nullable: true })
  resultingSessionEarningReviewId!: string | null;

  @ApiProperty({ type: AdminSessionPackageEntitlementDecisionActorDto })
  decidedBy!: AdminSessionPackageEntitlementDecisionActorDto;

  @ApiProperty()
  decidedAt!: string;

  @ApiProperty()
  idempotencyKey!: string;
}

export class AdminSessionPackageEntitlementDecisionDataResponseDto {
  @ApiProperty({ type: AdminSessionPackageEntitlementDecisionItemDto })
  item!: AdminSessionPackageEntitlementDecisionItemDto;
}

export class AdminSessionPackageEntitlementDecisionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionPackageEntitlementDecisionDataResponseDto })
  data!: AdminSessionPackageEntitlementDecisionDataResponseDto;
}
