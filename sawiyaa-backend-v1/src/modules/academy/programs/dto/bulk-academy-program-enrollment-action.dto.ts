import { IsArray, ArrayMinSize, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AcademyProgramEnrollmentBulkAction {
  MARK_COMPLETED = 'MARK_COMPLETED',
  MARK_CERTIFIED = 'MARK_CERTIFIED',
  CANCEL_ENROLLMENT = 'CANCEL_ENROLLMENT',
}

export class BulkAcademyProgramEnrollmentActionDto {
  @IsEnum(AcademyProgramEnrollmentBulkAction)
  action!: AcademyProgramEnrollmentBulkAction;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  enrollmentIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
