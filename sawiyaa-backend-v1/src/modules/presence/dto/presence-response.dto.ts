import { ApiProperty } from '@nestjs/swagger';
import { PresenceStatus } from '@prisma/client';

export class PresenceResponseDto {
  @ApiProperty({ enum: PresenceStatus })
  status!: PresenceStatus;

  @ApiProperty()
  isInstantBookingEnabled!: boolean;

  @ApiProperty({ nullable: true })
  lastSeenAt!: string | null;

  @ApiProperty({ nullable: true })
  lastHeartbeatAt!: string | null;

  @ApiProperty({ nullable: true })
  manuallySetAt!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class PublicPresenceResponseDto {
  @ApiProperty({ enum: PresenceStatus })
  status!: PresenceStatus;

  @ApiProperty()
  isInstantBookingEnabled!: boolean;

  @ApiProperty({ nullable: true })
  lastSeenAt!: string | null;
}

export class MyPresenceDataResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PresenceResponseDto })
  presence!: PresenceResponseDto;
}

export class PublicPresenceDataResponseDto {
  @ApiProperty({ type: PublicPresenceResponseDto })
  presence!: PublicPresenceResponseDto;
}

export class MyPresenceSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: MyPresenceDataResponseDto })
  data!: MyPresenceDataResponseDto;
}

export class PublicPresenceSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PublicPresenceDataResponseDto })
  data!: PublicPresenceDataResponseDto;
}
