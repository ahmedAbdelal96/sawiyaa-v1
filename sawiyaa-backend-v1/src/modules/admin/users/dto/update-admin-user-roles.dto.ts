import { ApiProperty } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminUserRolesDto {
  @ApiProperty({ enum: UserRoleType, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRoleType, { each: true })
  @Type(() => String)
  roles!: UserRoleType[];

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
