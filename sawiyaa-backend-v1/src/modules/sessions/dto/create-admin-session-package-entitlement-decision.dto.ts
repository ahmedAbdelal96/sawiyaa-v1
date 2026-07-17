import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const PACKAGE_ENTITLEMENT_DECISION_TYPES = [
  'RESTORE_TO_PACKAGE',
  'COUNT_AS_USED',
] as const;

const PACKAGE_ENTITLEMENT_REASON_CODES = [
  'PATIENT_FAULT',
  'PATIENT_NO_SHOW',
  'PRACTITIONER_FAULT',
  'ADMIN_EXCEPTION',
] as const;

export type PackageEntitlementDecisionType =
  (typeof PACKAGE_ENTITLEMENT_DECISION_TYPES)[number];

export type PackageEntitlementReasonCode =
  (typeof PACKAGE_ENTITLEMENT_REASON_CODES)[number];

export class CreateAdminSessionPackageEntitlementDecisionDto {
  @ApiProperty({
    enum: PACKAGE_ENTITLEMENT_DECISION_TYPES,
    description:
      'How the cancelled/no-show package session should affect the package entitlement.',
  })
  @IsIn(PACKAGE_ENTITLEMENT_DECISION_TYPES)
  decisionType!: PackageEntitlementDecisionType;

  @ApiProperty({
    enum: PACKAGE_ENTITLEMENT_REASON_CODES,
    description:
      'Structured reason code describing why this package entitlement decision was made.',
  })
  @IsIn(PACKAGE_ENTITLEMENT_REASON_CODES)
  reasonCode!: PackageEntitlementReasonCode;

  @ApiPropertyOptional({
    description: 'Optional internal note for audit context.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string | null;

  @ApiProperty({
    description:
      'Stable idempotency key to make the decision creation safe to replay.',
    maxLength: 191,
  })
  @IsString()
  @MaxLength(191)
  idempotencyKey!: string;
}
