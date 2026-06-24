import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePackagePlanDto {
  @ApiPropertyOptional({ example: 'Premium 4 Session Bundle' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  title?: string;

  @ApiPropertyOptional({ example: 'Four sessions with extra flexibility.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ minimum: 1, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PackagePlanSettingsItemDto {
  @ApiProperty()
  packagesEnabled!: boolean;

  @ApiProperty()
  packagesPurchaseEnabled!: boolean;
}

export class PackagePlanSettingsDataDto {
  @ApiProperty({ type: PackagePlanSettingsItemDto })
  item!: PackagePlanSettingsItemDto;
}

export class PackagePlanSettingsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePlanSettingsDataDto })
  data!: PackagePlanSettingsDataDto;
}
