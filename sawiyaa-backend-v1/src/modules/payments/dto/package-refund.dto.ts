import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PackageRefundPreviewDto {
  @ApiProperty() packagePurchaseId!: string;
  @ApiProperty() patient!: { id: string; displayName: string | null };
  @ApiProperty() practitioner!: { id: string; displayName: string | null };
  @ApiProperty() packageName!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() packageNetPaid!: string;
  @ApiProperty() totalSessions!: number;
  @ApiProperty() usedSessions!: number;
  @ApiProperty() unusedSessions!: number;
  @ApiProperty() reservedSessions!: number;
  @ApiProperty({ nullable: true }) standalonePriceSnapshot!: string | null;
  @ApiProperty({ type: [String] }) standaloneSnapshots!: string[];
  @ApiProperty({ nullable: true }) usedStandaloneValue!: string | null;
  @ApiProperty({ nullable: true }) suggestedRefundAmount!: string | null;
  @ApiProperty() priorRefundedAmount!: string;
  @ApiProperty() maxFinalRefundAmount!: string;
  @ApiProperty() futureSessionsAffected!: number;
  @ApiProperty({ type: [String] }) futureSessionIds!: string[];
  @ApiProperty() packageStatus!: string;
  @ApiProperty() manualReviewRequired!: boolean;
  @ApiProperty({ nullable: true }) manualReviewReason!: string | null;
}

export class FinalizePackageRefundDto {
  @ApiPropertyOptional({
    example: 180,
    description: 'Final wallet amount in major units. Omit only when a snapshot-based suggestion exists.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalAmount?: number;

  @ApiProperty({ example: 'Package refund approved after review.' })
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({ description: 'Evidence/ticket reference required for historical manual-price review.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceReference?: string;

  @ApiPropertyOptional({ description: 'Stable retry key for the package refund command.' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  idempotencyKey?: string;
}

export class PackageRefundPreviewResponseDto {
  @ApiProperty({ type: PackageRefundPreviewDto }) item!: PackageRefundPreviewDto;
}
