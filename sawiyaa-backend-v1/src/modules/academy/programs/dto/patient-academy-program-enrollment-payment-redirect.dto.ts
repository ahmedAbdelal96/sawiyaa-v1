import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PatientAcademyProgramEnrollmentPaymentRedirectQueryDto {
  @ApiPropertyOptional({
    example:
      'sawiyaa://academy/program-enrollments/enrollment_123/payment-return',
    description:
      'Optional trusted return URL used to return to the Academy program payment-return screen after checkout.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  returnUrl?: string;
}
