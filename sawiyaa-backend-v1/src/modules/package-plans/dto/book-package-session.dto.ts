import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString, MaxLength } from 'class-validator';

export class BookPackageSessionDto {
  @ApiProperty({
    example: '2026-09-22T10:00:00.000Z',
    description: 'Requested appointment start with an explicit timezone/offset',
  })
  @IsISO8601()
  @IsString()
  @MaxLength(40)
  scheduledStartAt!: string;
}
