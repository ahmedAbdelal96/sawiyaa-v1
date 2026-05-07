import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ListSessionsDto } from './list-sessions.dto';

export enum AdminSessionsSortDto {
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class ListAdminSessionsDto extends ListSessionsDto {
  @ApiPropertyOptional({
    description: 'Sort sessions by scheduled start datetime.',
    enum: AdminSessionsSortDto,
    default: AdminSessionsSortDto.NEWEST,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim().toLowerCase()
      : undefined,
  )
  @IsEnum(AdminSessionsSortDto)
  sort?: AdminSessionsSortDto = AdminSessionsSortDto.NEWEST;

  @ApiPropertyOptional({
    description: 'Filter by practitioner profile id.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsUUID()
  practitionerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by patient profile id.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({
    description:
      'When true, returns only sessions that passed their scheduled start and are still in active pre/post-start lifecycle states.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  late?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, only returns sessions that do not yet have persisted attendance telemetry events.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  missingAttendance?: boolean;
}
