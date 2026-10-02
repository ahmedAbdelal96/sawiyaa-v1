import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PractitionerProfessionalContentLocaleDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 191 })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  professionalTitle?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string | null;
}

export class PractitionerProfessionalContentDto {
  @ApiPropertyOptional({
    type: PractitionerProfessionalContentLocaleDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerProfessionalContentLocaleDto)
  ar?: PractitionerProfessionalContentLocaleDto | null;

  @ApiPropertyOptional({
    type: PractitionerProfessionalContentLocaleDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerProfessionalContentLocaleDto)
  en?: PractitionerProfessionalContentLocaleDto | null;
}
