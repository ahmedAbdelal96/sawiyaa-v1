import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationReportReason, ModerationReportTargetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateModerationReportDto {
  @ApiProperty({ enum: ModerationReportTargetType })
  @IsEnum(ModerationReportTargetType)
  targetType!: ModerationReportTargetType;

  @ApiProperty()
  @IsUUID()
  targetId!: string;

  @ApiProperty({ enum: ModerationReportReason })
  @IsEnum(ModerationReportReason)
  reason!: ModerationReportReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

