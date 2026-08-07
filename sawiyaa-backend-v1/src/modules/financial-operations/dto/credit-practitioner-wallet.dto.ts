import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreditPractitionerWalletDto {
  @ApiPropertyOptional({ example: '70.00' })
  @IsOptional()
  @IsNumberString()
  approvedWalletCreditAmount?: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsNumberString()
  walletCreditDifferenceAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  walletCreditOverrideReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalReason?: string;

  @ApiPropertyOptional({ description: 'Client idempotency key scoped to this entitlement and operation.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotencyKey?: string;
}
