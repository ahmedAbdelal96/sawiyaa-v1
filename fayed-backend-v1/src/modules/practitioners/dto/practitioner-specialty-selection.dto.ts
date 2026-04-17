import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class PractitionerSpecialtySelectionInputDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Primary specialty category that owns every selected specialty',
  })
  @IsUUID('4')
  primarySpecialtyCategoryId!: string;

  @ApiProperty({
    type: [String],
    description: 'Specialty ids that must all belong to the selected category',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  specialtyIds!: string[];
}
