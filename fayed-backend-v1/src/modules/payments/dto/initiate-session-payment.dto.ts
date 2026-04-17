import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}
