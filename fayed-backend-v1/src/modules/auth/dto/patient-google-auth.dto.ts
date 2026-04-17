import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PatientGoogleAuthDto {
  @ApiProperty({
    description: 'Google ID token issued by the client-side Google sign-in flow',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiProperty({
    required: false,
    description: 'Optional client device identifier for session auditing',
  })
  @IsString()
  deviceId?: string;
}
