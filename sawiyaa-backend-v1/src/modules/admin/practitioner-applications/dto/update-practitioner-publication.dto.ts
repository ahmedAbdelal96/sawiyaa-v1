import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdatePractitionerPublicationDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isPublished!: boolean;

  @ApiProperty({
    required: false,
    example: 'Temporary administrative unpublication',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
