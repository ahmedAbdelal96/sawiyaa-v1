import { ApiProperty } from '@nestjs/swagger';
import { PermissionOverrideEffect } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PermissionKey } from '@common/enums/permission-key.enum';

export class PermissionOverrideOperationDto {
  @ApiProperty({ enum: PermissionKey })
  @IsEnum(PermissionKey)
  permissionKey!: PermissionKey;

  /**
   * When omitted, the operation removes any existing override for the given key.
   */
  @ApiProperty({
    enum: PermissionOverrideEffect,
    required: false,
    description: 'ALLOW or DENY. Omit to remove override.',
  })
  @IsOptional()
  @IsEnum(PermissionOverrideEffect)
  effect?: PermissionOverrideEffect;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class UpdateAdminUserPermissionOverridesDto {
  @ApiProperty({ type: [PermissionOverrideOperationDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideOperationDto)
  operations!: PermissionOverrideOperationDto[];
}
