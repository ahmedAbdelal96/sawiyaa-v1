import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionAdminDecisionType } from '@prisma/client';
import { Equals, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdminSessionManualDecisionDto {
  @ApiProperty({
    enum: SessionAdminDecisionType,
    description:
      'The type of manual decision the admin is recording for this session.',
  })
  @IsEnum(SessionAdminDecisionType)
  decisionType!: SessionAdminDecisionType;

  @ApiProperty({
    description:
      'Structured reason code identifying the basis for this decision.',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  reasonCode!: string;

  @ApiPropertyOptional({
    description: 'Free-text internal note from the admin.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string | null;

  @ApiProperty({
    description:
      'Must be true. Confirms the admin has reviewed the attendance evidence before recording this decision.',
  })
  @Equals(true)
  confirmEvidenceReviewed!: true;

  @ApiProperty({
    description:
      'Must be true. Confirms no automatic refund will be triggered by this decision.',
  })
  @Equals(true)
  confirmNoAutomaticRefund!: true;

  @ApiProperty({
    description:
      'Must be true. Confirms no automatic payout will be triggered by this decision.',
  })
  @Equals(true)
  confirmNoAutomaticPayout!: true;

  @ApiPropertyOptional({
    description:
      'If true, a new decision will supersede any existing active final decision. ' +
      'If false or absent and a final decision already exists, the request is rejected.',
  })
  @IsOptional()
  @IsBoolean()
  supersedePrevious?: boolean;
}
