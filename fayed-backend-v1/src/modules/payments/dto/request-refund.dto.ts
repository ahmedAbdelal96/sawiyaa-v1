import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class RequestRefundDto {
  @ApiPropertyOptional({
    example: 250,
    description:
      'Optional refund amount in major units. Omit to refund all remaining refundable amount.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ example: 'Patient requested a cancellation refund.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
