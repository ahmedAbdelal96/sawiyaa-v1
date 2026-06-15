import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UploadAdminPractitionerCredentialFileDto {
  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  credentialType!: CredentialType;

  @ApiPropertyOptional({
    example: '2028-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
