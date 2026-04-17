import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelInstantBookingRequestDto {
  @ApiPropertyOptional({
    description: 'Optional cancellation note stored for operational traceability baseline',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
