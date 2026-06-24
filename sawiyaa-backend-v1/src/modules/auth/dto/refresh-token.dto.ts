import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    required: false,
    description:
      'Optional refresh token when the client does not send it as Authorization Bearer token',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
