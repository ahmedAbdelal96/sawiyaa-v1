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
}
