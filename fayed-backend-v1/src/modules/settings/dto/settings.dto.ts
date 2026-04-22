import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLocale } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS } from '../types/settings.types';

export class SettingsPreferencesDto {
  @ApiProperty({ enum: ContentLocale, nullable: true })
  locale!: ContentLocale | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;
}

export class SettingsNotificationPreferenceItemDto {
  @ApiProperty()
  typeSlug!: string;

  @ApiProperty({ enum: SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS })
  channel!: (typeof SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS)[number];

  @ApiProperty()
  enabled!: boolean;
}

export class SettingsNotificationPreferencesDto {
  @ApiProperty({ type: SettingsNotificationPreferenceItemDto, isArray: true })
  items!: SettingsNotificationPreferenceItemDto[];

  @ApiProperty({
    enum: SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS,
    isArray: true,
  })
  supportedChannels!: Array<
    (typeof SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS)[number]
  >;

  @ApiProperty()
  isPersisted!: boolean;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class SettingsOwnershipDto {
  @ApiProperty({ type: String, isArray: true })
  ownedSurfaces!: string[];

  @ApiProperty({ type: String, isArray: true })
  outOfScopeSurfaces!: string[];
}

export class SettingsReadItemDto {
  @ApiProperty({ type: SettingsPreferencesDto })
  preferences!: SettingsPreferencesDto;

  @ApiProperty({ type: SettingsNotificationPreferencesDto })
  notificationPreferences!: SettingsNotificationPreferencesDto;

  @ApiProperty({ type: SettingsOwnershipDto })
  ownership!: SettingsOwnershipDto;
}

export class SettingsReadDataDto {
  @ApiProperty({ type: SettingsReadItemDto })
  item!: SettingsReadItemDto;
}

export class SettingsReadSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SettingsReadDataDto })
  data!: SettingsReadDataDto;
}

export class SettingsPreferencesItemDataDto {
  @ApiProperty({ type: SettingsPreferencesDto })
  item!: SettingsPreferencesDto;
}

export class SettingsPreferencesItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SettingsPreferencesItemDataDto })
  data!: SettingsPreferencesItemDataDto;
}

export class SettingsNotificationPreferencesItemDataDto {
  @ApiProperty({ type: SettingsNotificationPreferencesDto })
  item!: SettingsNotificationPreferencesDto;
}

export class SettingsNotificationPreferencesItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SettingsNotificationPreferencesItemDataDto })
  data!: SettingsNotificationPreferencesItemDataDto;
}

export class PatchMySettingsPreferencesDto {
  @ApiPropertyOptional({
    enum: ContentLocale,
    description:
      'Locale preference candidate. Final persistence ownership lands in next slice.',
  })
  @IsOptional()
  @IsEnum(ContentLocale)
  locale?: ContentLocale;

  @ApiPropertyOptional({
    description:
      'IANA timezone preference candidate (for example: Africa/Cairo).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

export class PutMyNotificationPreferencesDto {
  @ApiProperty({
    type: () => PutMyNotificationPreferenceItemDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PutMyNotificationPreferenceItemDto)
  items!: PutMyNotificationPreferenceItemDto[];
}

export class PutMyNotificationPreferenceItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  typeSlug!: string;

  @ApiProperty({ enum: SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS })
  @IsIn(SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS)
  channel!: (typeof SETTINGS_SUPPORTED_NOTIFICATION_CHANNELS)[number];

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
