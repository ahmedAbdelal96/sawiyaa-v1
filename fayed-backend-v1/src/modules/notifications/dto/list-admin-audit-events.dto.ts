import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationCategory,
  NotificationChannel,
  UserRoleType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum AdminAuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AdminAuditSource {
  SYSTEM = 'SYSTEM',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export class ListAdminAuditEventsDto {
  @ApiPropertyOptional({
    description: 'ISO date; include events on/after this date',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'ISO date; include events on/before this date',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: UserRoleType })
  @IsOptional()
  @IsEnum(UserRoleType)
  actorRole?: UserRoleType;

  @ApiPropertyOptional({
    description:
      'Event family prefix, for example: auth, payments, sessions, training',
  })
  @IsOptional()
  @IsString()
  eventFamily?: string;

  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ enum: AdminAuditSeverity })
  @IsOptional()
  @IsEnum(AdminAuditSeverity)
  severity?: AdminAuditSeverity;

  @ApiPropertyOptional({ enum: AdminAuditSource })
  @IsOptional()
  @IsEnum(AdminAuditSource)
  source?: AdminAuditSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetEntityType?: string;

  @ApiPropertyOptional({
    description:
      'Free text search against event slug, actor, target, and snapshots',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
