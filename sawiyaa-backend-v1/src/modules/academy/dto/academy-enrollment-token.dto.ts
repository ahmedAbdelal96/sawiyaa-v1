import { IsOptional, IsString } from 'class-validator';

export class AcademyEnrollmentTokenDto {
  @IsOptional()
  @IsString()
  token?: string;
}
