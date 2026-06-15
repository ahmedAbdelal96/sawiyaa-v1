import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TrainingEnrollmentPaymentRedirectQueryDto {
  @ApiPropertyOptional({
    description: 'Optional trusted payment return URL for the caller surface',
    example: 'http://localhost:3000/en/patient/training/enrollment_1/payment-return',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string;
}
