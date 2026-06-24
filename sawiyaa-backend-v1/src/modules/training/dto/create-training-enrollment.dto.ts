import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTrainingEnrollmentDto {
  @ApiPropertyOptional({
    description: 'Optional coupon code for enrollment payment',
    example: 'WELCOME10',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @ApiPropertyOptional({
    description:
      'Optional trusted payment return URL used by the web caller surface',
    example: 'http://localhost:3000/en/patient/training/enrollment_1/payment-return',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string;
}
