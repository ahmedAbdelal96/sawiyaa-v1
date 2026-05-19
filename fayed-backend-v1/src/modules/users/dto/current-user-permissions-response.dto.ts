import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserPermissionsResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    description:
      'Resolved effective permission keys for the current user. ' +
      'Reflects role-based grants and any user-level overrides. ' +
      'SUPER_ADMIN receives all concrete permission keys. ' +
      'Do not use this list for backend authorization — it is a frontend read hint only.',
  })
  permissions!: string[];
}

export class CurrentUserPermissionsEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CurrentUserPermissionsResponseDto })
  data!: CurrentUserPermissionsResponseDto;
}
