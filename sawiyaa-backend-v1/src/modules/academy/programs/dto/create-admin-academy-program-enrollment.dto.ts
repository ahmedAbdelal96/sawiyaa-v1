import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminAcademyProgramEnrollmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  fullName!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  employer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  education?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
