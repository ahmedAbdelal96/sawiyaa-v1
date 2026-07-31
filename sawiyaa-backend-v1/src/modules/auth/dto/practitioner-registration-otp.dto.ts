import { IsString, Length, IsUUID } from 'class-validator';

export class PractitionerRegistrationOtpDto {
  @IsUUID()
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
