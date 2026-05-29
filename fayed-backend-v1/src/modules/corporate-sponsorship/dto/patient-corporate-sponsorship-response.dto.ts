import { ApiProperty } from '@nestjs/swagger';
import { CorporateCoverageType, CorporateBillingMode, CorporateMarket } from '@prisma/client';

export class CorporateSponsorshipPreviewResponseDto {
  @ApiProperty()
  eligible: boolean;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  planName: string;

  @ApiProperty()
  coverageType: CorporateCoverageType;

  @ApiProperty()
  originalAmount: string;

  @ApiProperty()
  coveredAmount: string;

  @ApiProperty()
  patientPayAmount: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  reservationTtlMinutes: number;

  @ApiProperty({ required: false })
  message?: string;
}

export class CorporateSponsorshipReserveResponseDto {
  @ApiProperty()
  sponsorshipId: string;

  @ApiProperty()
  reservedUntil: Date;

  @ApiProperty()
  originalAmount: string;

  @ApiProperty()
  coveredAmount: string;

  @ApiProperty()
  patientPayAmount: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  coverageType: CorporateCoverageType;

  @ApiProperty()
  planName: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty({ required: false })
  message?: string;
}

export class CorporateSponsorshipReleaseResponseDto {
  @ApiProperty()
  released: boolean;

  @ApiProperty()
  previousSponsorshipId: string;

  @ApiProperty({ required: false })
  message?: string;
}