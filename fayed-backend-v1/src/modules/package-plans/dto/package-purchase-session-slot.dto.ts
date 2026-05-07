import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString, MaxLength } from 'class-validator';

export class PackagePurchaseSessionSlotDto {
  @ApiProperty({
    example: '2026-06-05T21:00:00.000Z',
    description: 'Requested UTC session start datetime for this package slot',
  })
  @IsISO8601()
  @IsString()
  @MaxLength(40)
  scheduledStartAt!: string;
}
