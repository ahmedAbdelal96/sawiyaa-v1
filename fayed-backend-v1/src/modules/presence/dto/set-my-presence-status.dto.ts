import { ApiProperty } from '@nestjs/swagger';
import { PresenceStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Presence status changes are explicit manual transitions.
 * Sessions or instant-booking automation may later reuse the same enum without changing the API contract.
 */
export class SetMyPresenceStatusDto {
  @ApiProperty({ enum: PresenceStatus })
  @IsEnum(PresenceStatus)
  status!: PresenceStatus;
}
