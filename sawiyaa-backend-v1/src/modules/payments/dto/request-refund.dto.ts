import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RefundDestination } from '@prisma/client';
import {
  IsEnum,
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

  @ApiPropertyOptional({
    enum: RefundDestination,
    description:
      'Refund destination. CUSTOMER_WALLET credits the internal wallet. ORIGINAL_METHOD uses provider refund path.',
    default: RefundDestination.CUSTOMER_WALLET,
  })
  @IsOptional()
  @IsEnum(RefundDestination)
  destination?: RefundDestination;
}
