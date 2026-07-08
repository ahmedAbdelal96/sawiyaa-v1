import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcademyProgramEnrollmentPaymentRedirectQueryDto {
  @ApiPropertyOptional({
    example: 'public-access-token-uuid',
    description: 'Public access token for the academy program enrollment.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  token?: string;

  @ApiPropertyOptional({
    example:
      'sawiyaa://academy/program-enrollments/enrollment_123/payment-return?token=public-access-token-uuid',
    description:
      'Optional trusted return URL used to return to the Academy program payment-return screen after checkout.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  returnUrl?: string;
}
