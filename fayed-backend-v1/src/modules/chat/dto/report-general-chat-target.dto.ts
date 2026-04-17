import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationReportReason } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportGeneralChatTargetDto {
  @ApiProperty({ enum: ModerationReportReason })
  @IsEnum(ModerationReportReason)
  reason!: ModerationReportReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
