import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const ACADEMY_PROGRAM_ATTENDANCE_MARK_STATUSES = [
  'PRESENT',
  'ABSENT',
  'UNMARKED',
] as const;

export type AcademyProgramAttendanceMarkStatus =
  (typeof ACADEMY_PROGRAM_ATTENDANCE_MARK_STATUSES)[number];

export class SaveAdminAcademyProgramAttendanceItemDto {
  @IsString()
  @MaxLength(80)
  enrollmentId!: string;

  @IsIn(ACADEMY_PROGRAM_ATTENDANCE_MARK_STATUSES)
  status!: AcademyProgramAttendanceMarkStatus;
}

export class SaveAdminAcademyProgramAttendanceDto {
  @IsString()
  @MaxLength(80)
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveAdminAcademyProgramAttendanceItemDto)
  items!: SaveAdminAcademyProgramAttendanceItemDto[];
}
