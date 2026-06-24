import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAcademyCourseLectureDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lectureOrder!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  lectureTitle?: string;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty()
  @IsDateString()
  endsAt!: string;
}
