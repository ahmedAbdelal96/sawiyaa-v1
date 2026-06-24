import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReconciliationReviewStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminAccountingReconciliationReviewDto {
  @ApiProperty({ enum: ReconciliationReviewStatus })
  @IsEnum(ReconciliationReviewStatus)
  status!: ReconciliationReviewStatus;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
