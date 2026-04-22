import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSessionDto {
  @ApiPropertyOptional({
    description:
      'Optional patient-facing cancellation note stored for audit baseline',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
