import { ApiProperty } from '@nestjs/swagger';

export class PractitionerAvatarResponseDto {
  @ApiProperty()
  practitionerProfileId!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}

export class PractitionerAvatarSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerAvatarResponseDto })
  avatar!: PractitionerAvatarResponseDto;
}
