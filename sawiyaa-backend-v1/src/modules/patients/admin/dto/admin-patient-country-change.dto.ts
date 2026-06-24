import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

/**
 * Admin-only endpoint to change a patient's country.
 * Requires a reason for audit trail.
 */
export class AdminPatientCountryChangeDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 or alpha-3 country code for the target country (e.g. EG, KW, SA)',
    example: 'EG',
  })
  @IsString()
  @IsNotEmpty({ message: 'countryCode is required' })
  @Length(2, 3, { message: 'countryCode must be 2 or 3 characters' })
  @Matches(/^[A-Za-z]{2,3}$/, { message: 'countryCode must be a valid ISO country code' })
  countryCode!: string;

  @ApiProperty({
    description: 'Reason for the country change. Required for audit trail.',
    example: 'Patient confirmed residence change to Egypt during support call',
  })
  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  @Length(10, 500, { message: 'reason must be between 10 and 500 characters' })
  reason!: string;
}