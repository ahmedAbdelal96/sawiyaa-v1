import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ManualProviderRefundOutcome {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

/**
 * Evidence-only command for a provider result that the automated inquiry
 * explicitly could not establish. The server derives all financial values.
 */
export class ManualFinalizeProviderRefundDto {
  @ApiProperty({ enum: ManualProviderRefundOutcome })
  @IsEnum(ManualProviderRefundOutcome)
  outcome!: ManualProviderRefundOutcome;

  @ApiProperty({
    description: 'Provider case, order, transaction, or settlement reference.',
    maxLength: 191,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  evidenceReference!: string;

  @ApiProperty({
    description: 'Why the operator can establish this provider outcome.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Optional structured, non-sensitive provider evidence.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  evidenceMetadata?: Record<string, string>;
}
