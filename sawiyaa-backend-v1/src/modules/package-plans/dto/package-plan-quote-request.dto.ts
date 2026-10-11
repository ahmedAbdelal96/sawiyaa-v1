import { ApiProperty } from '@nestjs/swagger';
import { SessionMode } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, MaxLength, Min, Max } from 'class-validator';

export class PackagePlanQuoteRequestDto {
  @ApiProperty({
    description: 'Stable package plan code',
    example: 'SESSIONS_4',
  })
  @IsString()
  @MaxLength(100)
  packagePlanCode!: string;

  @ApiProperty({
    description: 'Public practitioner slug',
    example: 'dr-youssef-abdallah',
  })
  @IsString()
  @MaxLength(191)
  practitionerSlug!: string;

  @ApiProperty({
    description: 'Selected duration in minutes',
    example: 60,
    enum: [30, 60],
  })
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(60)
  durationMinutes!: number;

  @ApiProperty({
    enum: [SessionMode.VIDEO],
    description: 'Sawiyaa currently supports video consultations only',
  })
  @IsIn([SessionMode.VIDEO])
  sessionMode!: 'VIDEO';

}
