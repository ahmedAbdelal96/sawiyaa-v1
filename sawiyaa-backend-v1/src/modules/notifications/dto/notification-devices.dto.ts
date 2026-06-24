import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const NOTIFICATION_DEVICE_PROVIDERS = ['EXPO', 'FCM', 'APNS'] as const;
export const NOTIFICATION_DEVICE_PLATFORMS = ['IOS', 'ANDROID', 'WEB'] as const;
export const NOTIFICATION_DEVICE_ROLES = ['PATIENT', 'PRACTITIONER'] as const;

export type NotificationDeviceProvider =
  (typeof NOTIFICATION_DEVICE_PROVIDERS)[number];
export type NotificationDevicePlatform =
  (typeof NOTIFICATION_DEVICE_PLATFORMS)[number];
export type NotificationDeviceRole = (typeof NOTIFICATION_DEVICE_ROLES)[number];

export class RegisterNotificationDeviceDto {
  @ApiProperty({ description: 'Push provider token or Expo push token.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token!: string;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_PROVIDERS })
  @IsIn(NOTIFICATION_DEVICE_PROVIDERS)
  provider!: NotificationDeviceProvider;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_PLATFORMS })
  @IsIn(NOTIFICATION_DEVICE_PLATFORMS)
  platform!: NotificationDevicePlatform;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_ROLES })
  @IsIn(NOTIFICATION_DEVICE_ROLES)
  role!: NotificationDeviceRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class RevokeNotificationDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;
}

export class NotificationDeviceItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_ROLES, nullable: true })
  role!: NotificationDeviceRole | null;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_PROVIDERS, nullable: true })
  provider!: NotificationDeviceProvider | null;

  @ApiProperty({ enum: NOTIFICATION_DEVICE_PLATFORMS })
  platform!: NotificationDevicePlatform;

  @ApiProperty({ nullable: true })
  deviceId!: string | null;

  @ApiProperty({ nullable: true })
  appVersion!: string | null;

  @ApiProperty({ nullable: true })
  locale!: string | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ nullable: true })
  lastSeenAt!: string | null;

  @ApiProperty({ nullable: true })
  revokedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class NotificationDeviceItemDataDto {
  @ApiProperty({ type: NotificationDeviceItemDto })
  item!: NotificationDeviceItemDto;
}

export class NotificationDevicesListDataDto {
  @ApiProperty({ type: NotificationDeviceItemDto, isArray: true })
  items!: NotificationDeviceItemDto[];
}

export class NotificationDeviceRegisterSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: NotificationDeviceItemDataDto })
  data!: NotificationDeviceItemDataDto;
}

export class NotificationDevicesListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: NotificationDevicesListDataDto })
  data!: NotificationDevicesListDataDto;
}

export class NotificationDeviceRevokeResultDto {
  @ApiProperty()
  revokedCount!: number;
}

export class NotificationDeviceRevokeDataDto {
  @ApiProperty({ type: NotificationDeviceRevokeResultDto })
  item!: NotificationDeviceRevokeResultDto;
}

export class NotificationDeviceRevokeSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: NotificationDeviceRevokeDataDto })
  data!: NotificationDeviceRevokeDataDto;
}
