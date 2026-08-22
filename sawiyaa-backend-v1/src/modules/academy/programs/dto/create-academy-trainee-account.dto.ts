import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CreateAcademyTraineeAccountDto {
  @ApiProperty({ description: 'Email used for the one-time trainee credentials' })
  @IsEmail()
  email!: string;
}
