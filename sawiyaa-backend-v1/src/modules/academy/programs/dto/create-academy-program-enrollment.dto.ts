import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAcademyProgramEnrollmentDto {
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
  sourceLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnUrlBase?: string;
}
