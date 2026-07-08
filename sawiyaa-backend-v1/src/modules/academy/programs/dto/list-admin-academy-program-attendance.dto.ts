import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListAdminAcademyProgramAttendanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sessionId?: string;
}
