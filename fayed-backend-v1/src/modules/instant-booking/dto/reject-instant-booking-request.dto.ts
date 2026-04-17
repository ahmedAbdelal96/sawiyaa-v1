import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectInstantBookingRequestDto {
  @ApiPropertyOptional({
    description: 'Optional rejection reason stored for operational traceability baseline',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
