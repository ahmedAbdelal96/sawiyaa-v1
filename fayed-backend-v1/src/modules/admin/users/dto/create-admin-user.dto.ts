import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoleType, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ maxLength: 191 })
  @IsString()
  @MaxLength(191)
  displayName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    enum: UserRoleType,
    isArray: true,
    description: 'Internal roles only (admin/staff roles).',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRoleType, { each: true })
  @Type(() => String)
  roles!: UserRoleType[];

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}
