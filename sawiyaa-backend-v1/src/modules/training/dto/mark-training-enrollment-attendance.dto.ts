import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum TrainingAttendanceMarkStatus {
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
}

export class MarkTrainingEnrollmentAttendanceDto {
  @ApiProperty({ enum: TrainingAttendanceMarkStatus })
  @IsEnum(TrainingAttendanceMarkStatus)
  status!: TrainingAttendanceMarkStatus;
}
