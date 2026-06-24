import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  NOTIFICATION_DEVICE_ROLES,
  type NotificationDeviceRole,
} from './notification-devices.dto';

export class DevTestPushRequestDto {
  @ApiPropertyOptional({
    description:
      'Target user id for the push test. Defaults to the authenticated user when omitted.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_ROLES })
  @IsIn(NOTIFICATION_DEVICE_ROLES)
  role!: NotificationDeviceRole;

  @ApiPropertyOptional({
    description:
      'Optional internal route path to verify tap routing for the target role.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  routePath?: string;
}

export class DevTestPushResultDto {
  @ApiProperty()
  notificationId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_ROLES })
  role!: NotificationDeviceRole;

  @ApiProperty({ nullable: true })
  routePath!: string | null;

  @ApiProperty()
  outcome!: string;

  @ApiProperty()
  executed!: boolean;

  @ApiProperty({ nullable: true })
  attemptId!: string | null;

  @ApiProperty({ nullable: true })
  reason!: string | null;
}

export class DevTestPushDataDto {
  @ApiProperty({ type: DevTestPushResultDto })
  item!: DevTestPushResultDto;
}

export class DevTestPushSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: DevTestPushDataDto })
  data!: DevTestPushDataDto;
}
