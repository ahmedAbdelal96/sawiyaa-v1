import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class InitiateSessionPaymentDto {
  @ApiProperty({
    required: false,
    example: 'WELCOME10',
    description:
      'Optional coupon code resolved by the financial rules layer before payment provider initiation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @ApiProperty({
    required: false,
    example: true,
    description:
      'When true, available customer wallet balance is reserved/applied before gateway checkout.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useWalletBalance?: boolean;
}
