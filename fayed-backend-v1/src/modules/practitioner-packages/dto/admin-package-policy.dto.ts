import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfigScopeType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdatePackagePolicyDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxNonArchivedPackages!: number;

  @ApiPropertyOptional({
    description: 'Optional practitioner id for scoped override updates',
  })
  @IsOptional()
  @IsUUID()
  practitionerId?: string;
}

export class GetPackagePolicyDto {
  @ApiPropertyOptional({
    description: 'Optional practitioner id to resolve an effective policy view',
  })
  @IsOptional()
  @IsUUID()
  practitionerId?: string;
}

export class PackagePolicyViewDto {
  @ApiProperty()
  globalMaxNonArchivedPackages!: number;

  @ApiProperty()
  effectiveMaxNonArchivedPackages!: number;

  @ApiProperty({ nullable: true })
  practitionerId!: string | null;
}

export class PackagePolicyUpdateResultDto {
  @ApiProperty({ enum: ConfigScopeType })
  scopeType!: ConfigScopeType;

  @ApiProperty({ nullable: true })
  scopeRefId!: string | null;

  @ApiProperty({ nullable: true })
  value!: string | null;

  @ApiProperty()
  isActive!: boolean;
}

export class PackagePolicyDataDto {
  @ApiProperty({ type: PackagePolicyViewDto })
  item!: PackagePolicyViewDto;
}

export class PackagePolicyUpdateDataDto {
  @ApiProperty({ type: PackagePolicyUpdateResultDto })
  item!: PackagePolicyUpdateResultDto;
}

export class PackagePolicySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePolicyDataDto })
  data!: PackagePolicyDataDto;
}

export class PackagePolicyUpdateSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PackagePolicyUpdateDataDto })
  data!: PackagePolicyUpdateDataDto;
}
