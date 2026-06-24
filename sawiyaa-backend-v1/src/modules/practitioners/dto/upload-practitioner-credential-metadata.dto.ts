import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

/**
 * Metadata-only upload DTO.
 * The module stores credential metadata reference and review state; file storage flows are handled elsewhere.
 */
export class UploadPractitionerCredentialMetadataDto {
  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  credentialType!: CredentialType;

  @ApiProperty({
    description: 'Resolved file URL/reference from the active storage layer',
  })
  @IsNotEmpty()
  @IsString()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(500)
  fileUrl!: string;

  @ApiPropertyOptional({
    description: 'Optional expiration date for time-bound credentials',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
