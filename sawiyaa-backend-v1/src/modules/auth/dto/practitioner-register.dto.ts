import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialType, PractitionerType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PractitionerRegisterCredentialDto {
  @ApiProperty({ enum: CredentialType })
  @IsEnum(CredentialType)
  credentialType!: CredentialType;

  @ApiProperty({
    example: 'https://files.example.com/credential.pdf',
  })
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  fileUrl!: string;

  @ApiPropertyOptional({
    example: '2028-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class PractitionerRegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'EG' })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  phoneCountryCode!: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  @MinLength(1)
  phone!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    enum: PractitionerType,
    default: PractitionerType.OTHER,
  })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({
    example: 'Clinical Psychologist',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  professionalTitle?: string;

  @ApiPropertyOptional({
    example: 'Short professional bio',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string;

  @ApiPropertyOptional({
    example: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    example: 'EG',
    description: 'ISO-2 country code',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  countryCode?: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Primary specialty category id used to constrain selected specialty ids',
  })
  @IsUUID('4')
  primarySpecialtyCategoryId!: string;

  @ApiProperty({
    type: [String],
    description: 'Active specialty ids to link for the practitioner',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  specialtyIds!: string[];

  @ApiPropertyOptional({
    type: PractitionerRegisterCredentialDto,
    description: 'Optional initial credential metadata record',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerRegisterCredentialDto)
  initialCredential?: PractitionerRegisterCredentialDto;
}
