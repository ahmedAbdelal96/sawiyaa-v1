import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PractitionerRegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'EG' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  phoneCountryCode?: string;

  @ApiPropertyOptional({ example: '01012345678' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  displayName?: string;
}
