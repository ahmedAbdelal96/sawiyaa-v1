import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationCaseActionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExecuteModerationActionDto {
  @ApiProperty({ enum: ModerationCaseActionType })
  @IsEnum(ModerationCaseActionType)
  action!: ModerationCaseActionType;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
