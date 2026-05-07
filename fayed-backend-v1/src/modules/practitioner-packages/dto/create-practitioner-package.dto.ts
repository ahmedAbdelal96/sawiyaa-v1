import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PackageSchedulePolicy,
  SessionMode,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePractitionerPackageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(191)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionCount!: number;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionDurationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  @IsEnum(SessionMode)
  sessionMode!: SessionMode;

  @ApiProperty({ minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  priceEgp!: number;

  @ApiProperty({ minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  priceUsd!: number;

  @ApiPropertyOptional({
    enum: PackageSchedulePolicy,
    default: PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
  })
  @IsOptional()
  @IsEnum(PackageSchedulePolicy)
  schedulePolicy?: PackageSchedulePolicy;
}
