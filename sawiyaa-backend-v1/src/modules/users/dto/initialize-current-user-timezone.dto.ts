import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InitializeCurrentUserTimezoneDto {
  @ApiProperty({ example: 'Africa/Cairo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  timezone!: string;
}

export class InitializeCurrentUserTimezoneResponseDto {
  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty({
    description: 'True when this request persisted the missing timezone.',
  })
  initialized!: boolean;
}

export class InitializeCurrentUserTimezoneEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: InitializeCurrentUserTimezoneResponseDto })
  data!: InitializeCurrentUserTimezoneResponseDto;
}
