import { ApiProperty } from '@nestjs/swagger';
import { CredentialReviewStatus, CredentialType } from '@prisma/client';

export class PractitionerCredentialResponseDto {
  @ApiProperty()
  credentialId!: string;

  @ApiProperty({ enum: CredentialType })
  credentialType!: CredentialType;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty({ enum: CredentialReviewStatus })
  reviewStatus!: CredentialReviewStatus;

  @ApiProperty({ nullable: true })
  expiresAt!: Date | null;

  @ApiProperty()
  uploadedAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PractitionerCredentialListResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerCredentialResponseDto, isArray: true })
  credentials!: PractitionerCredentialResponseDto[];
}

export class PractitionerCredentialUploadSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerCredentialResponseDto })
  credential!: PractitionerCredentialResponseDto;
}
