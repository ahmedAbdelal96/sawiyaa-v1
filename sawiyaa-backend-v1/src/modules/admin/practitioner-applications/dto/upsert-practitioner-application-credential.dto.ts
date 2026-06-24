import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialReviewStatus, CredentialType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreatePractitionerApplicationCredentialDto {
  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  credentialType!: CredentialType;

  @ApiProperty({
    description: 'Resolved credential file url/reference',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(500)
  fileUrl!: string;

  @ApiPropertyOptional({ enum: CredentialReviewStatus })
  @IsOptional()
  @IsEnum(CredentialReviewStatus)
  reviewStatus?: CredentialReviewStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class UpdatePractitionerApplicationCredentialDto {
  @ApiPropertyOptional({ enum: CredentialType })
  @IsOptional()
  @IsEnum(CredentialType)
  credentialType?: CredentialType;

  @ApiPropertyOptional({
    description: 'Resolved credential file url/reference',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(500)
  fileUrl?: string;

  @ApiPropertyOptional({ enum: CredentialReviewStatus })
  @IsOptional()
  @IsEnum(CredentialReviewStatus)
  reviewStatus?: CredentialReviewStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
