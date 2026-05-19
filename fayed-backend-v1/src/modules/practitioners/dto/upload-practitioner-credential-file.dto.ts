import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UploadPractitionerCredentialFileDto {
  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  credentialType!: CredentialType;

  @ApiPropertyOptional({
    description: 'Optional expiration date for time-bound credentials',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

