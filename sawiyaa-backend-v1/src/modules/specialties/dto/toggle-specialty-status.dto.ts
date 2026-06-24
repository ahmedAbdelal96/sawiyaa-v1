import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleSpecialtyStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
