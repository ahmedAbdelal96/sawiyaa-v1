import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Uses the same minimum password requirement as registration and reset flows. */
export class ChangePasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
