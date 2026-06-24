import { ApiProperty } from '@nestjs/swagger';
import { UserRoleType, UserStatus } from '@prisma/client';

export class AdminUserListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ nullable: true })
  primaryEmail!: string | null;

  @ApiProperty({ nullable: true })
  primaryPhone!: string | null;

  @ApiProperty({ enum: UserRoleType, isArray: true })
  roles!: UserRoleType[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminUsersPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AdminUsersListResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [AdminUserListItemResponseDto] })
  items!: AdminUserListItemResponseDto[];

  @ApiProperty({ type: AdminUsersPaginationResponseDto })
  pagination!: AdminUsersPaginationResponseDto;
}

export class AdminUserDetailsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  tokenVersion!: number;

  @ApiProperty({ nullable: true })
  defaultLocale!: string | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;

  @ApiProperty({
    type: [String],
    description: 'All emails (primary first).',
  })
  emails!: string[];

  @ApiProperty({
    type: [String],
    description: 'All phones (primary first).',
  })
  phones!: string[];

  @ApiProperty({ enum: UserRoleType, isArray: true })
  roles!: UserRoleType[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminUserDetailsSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: AdminUserDetailsResponseDto })
  item!: AdminUserDetailsResponseDto;
}

export class AdminUserMutationSuccessResponseDto {
  @ApiProperty()
  message!: string;
}

export class AdminUserPermissionOverrideItemResponseDto {
  @ApiProperty()
  permissionKey!: string;

  @ApiProperty()
  effect!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminUserPermissionOverridesListSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [AdminUserPermissionOverrideItemResponseDto] })
  items!: AdminUserPermissionOverrideItemResponseDto[];
}
