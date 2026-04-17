import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseScheduleStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TRAINING_DEFAULT_TIMEZONE,
  TRAINING_EXTERNAL_ROOM_PROVIDER_ZOOM,
} from '../types/training.types';

export class CreateTrainingScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  scheduleCode?: string;

  @ApiPropertyOptional({ enum: CourseScheduleStatus })
  @IsOptional()
  @IsEnum(CourseScheduleStatus)
  status?: CourseScheduleStatus;

  @ApiProperty()
  @IsDateString()
  enrollmentOpenAt!: string;

  @ApiProperty()
  @IsDateString()
  enrollmentCloseAt!: string;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty()
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ default: TRAINING_DEFAULT_TIMEZONE })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxEnrollmentsOverride?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waitlistEnabled?: boolean;

  @ApiPropertyOptional({ example: TRAINING_EXTERNAL_ROOM_PROVIDER_ZOOM })
  @IsOptional()
  @IsString()
  @IsIn([TRAINING_EXTERNAL_ROOM_PROVIDER_ZOOM])
  externalRoomProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  externalRoomJoinUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  externalRoomHostUrl?: string;
}
