import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ConfigScopeType } from '@prisma/client';

export class ResolveConfigParamsDto {
  @IsString()
  key!: string;
}

export class ResolveConfigQueryDto {
  @IsOptional()
  @IsEnum(ConfigScopeType)
  scopeType?: ConfigScopeType;

  @ValidateIf(
    (dto: ResolveConfigQueryDto) =>
      dto.scopeType !== undefined && dto.scopeType !== ConfigScopeType.GLOBAL,
  )
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  scopeRefId?: string;
}
