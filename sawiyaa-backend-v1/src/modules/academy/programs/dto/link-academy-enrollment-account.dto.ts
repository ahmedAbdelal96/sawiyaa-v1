import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail } from 'class-validator';

export class LinkAcademyEnrollmentAccountDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Explicit confirmation that the existing account should be linked' })
  @IsBoolean()
  confirm!: boolean;
}
