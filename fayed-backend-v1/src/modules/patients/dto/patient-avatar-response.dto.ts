import { ApiProperty } from '@nestjs/swagger';

export class PatientAvatarResponseDto {
  @ApiProperty()
  patientProfileId!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}

export class PatientAvatarSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PatientAvatarResponseDto })
  avatar!: PatientAvatarResponseDto;
}
