import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmAdminAcademyProgramEnrollmentPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
