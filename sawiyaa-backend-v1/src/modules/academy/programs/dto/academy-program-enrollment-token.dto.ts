import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcademyProgramEnrollmentTokenDto {
  @ApiPropertyOptional({
    example: 'public-access-token-uuid',
    description: 'Public access token for the academy program enrollment.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  token?: string;
}
