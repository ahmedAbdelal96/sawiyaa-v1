import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class InitiateSessionPaymentDto {
  @ApiProperty({
    required: true,
    example: 'refund-policy-id-uuid',
    description:
      'Accepted session refund policy id. Payment initiation is blocked unless the current active session refund policy was explicitly accepted.',
  })
  @IsUUID()
  @IsNotEmpty()
  acceptedRefundPolicyId!: string;

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

  @ApiProperty({
    required: false,
    example: 'CARD',
    description:
      'Optional Paymob checkout method key for legacy fallback only. Unified Checkout ignores this value and lets Paymob present the real enabled methods.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  paymobMethod?: string;

  @ApiProperty({
    required: false,
    example: 'fayed://sessions/session_123/payment-return',
    description:
      'Optional trusted return URL for hosted checkout flows. When provided by a trusted caller surface, the payment provider can return directly to that same surface instead of the public web payment-return page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  returnUrl?: string;
}
