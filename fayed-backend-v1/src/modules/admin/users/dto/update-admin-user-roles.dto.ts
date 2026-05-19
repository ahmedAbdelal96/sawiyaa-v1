import { ApiProperty } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';

export class UpdateAdminUserRolesDto {
  @ApiProperty({ enum: UserRoleType, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRoleType, { each: true })
  @Type(() => String)
  roles!: UserRoleType[];
}
