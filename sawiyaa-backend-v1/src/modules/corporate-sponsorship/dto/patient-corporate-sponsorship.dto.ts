import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PreviewCorporateSponsorshipDto {
  @ApiProperty({
    description: 'Company code (e.g. TST)',
  })
  @IsString()
  @IsNotEmpty()
  companyCode: string;

  @ApiProperty({
    description: 'Benefit code (e.g. FYD-XXXX-XXXX-XXXX)',
  })
  @IsString()
  @IsNotEmpty()
  benefitCode: string;
}

export class ReserveCorporateSponsorshipDto {
  @ApiProperty({
    description: 'Company code (e.g. TST)',
  })
  @IsString()
  @IsNotEmpty()
  companyCode: string;

  @ApiProperty({
    description: 'Benefit code (e.g. FYD-XXXX-XXXX-XXXX)',
  })
  @IsString()
  @IsNotEmpty()
  benefitCode: string;
}

export class ReleaseCorporateSponsorshipDto {
  @ApiPropertyOptional({ description: 'Optional release reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}