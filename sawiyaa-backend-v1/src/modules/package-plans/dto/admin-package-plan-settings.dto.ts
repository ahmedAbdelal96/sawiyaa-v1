import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePackagePlanSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  packagesEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  packagesPurchaseEnabled?: boolean;
}

export class PackagePlanSettingsViewDto {
  @ApiProperty()
  packagesEnabled!: boolean;

  @ApiProperty()
  packagesPurchaseEnabled!: boolean;
}

export class PackagePlanSettingsDataDto {
  @ApiProperty({ type: PackagePlanSettingsViewDto })
  item!: PackagePlanSettingsViewDto;
}

export class PackagePlanSettingsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePlanSettingsDataDto })
  data!: PackagePlanSettingsDataDto;
}

export class PackagePlanSettingsUpdateSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePlanSettingsDataDto })
  data!: PackagePlanSettingsDataDto;
}
