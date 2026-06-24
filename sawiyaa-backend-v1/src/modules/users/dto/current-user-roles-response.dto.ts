import { ApiProperty } from '@nestjs/swagger';
import { AppRole } from '@common/enums/app-role.enum';
import { CurrentUserRoleSummaryDto } from './current-user-summary-response.dto';

export class CurrentUserRolesResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: AppRole, isArray: true })
  roles!: AppRole[];

  @ApiProperty({ type: CurrentUserRoleSummaryDto })
  roleSummary!: CurrentUserRoleSummaryDto;
}

export class CurrentUserRolesEnvelopeResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: CurrentUserRolesResponseDto })
  data!: CurrentUserRolesResponseDto;
}
