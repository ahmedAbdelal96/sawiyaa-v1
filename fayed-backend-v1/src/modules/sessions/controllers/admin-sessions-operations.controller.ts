import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminSessionAttendanceSuccessResponseDto } from '../dto/admin-session-attendance-response.dto';
import { AdminSessionsListSuccessResponseDto } from '../dto/admin-sessions-list-response.dto';
import { ListAdminSessionsDto } from '../dto/list-admin-sessions.dto';
import { AdminSessionRuntimeInspectionSuccessResponseDto } from '../dto/admin-session-ops-response.dto';
import { GetAdminSessionAttendanceUseCase } from '../use-cases/get-admin-session-attendance.use-case';
import { GetAdminSessionsUseCase } from '../use-cases/get-admin-sessions.use-case';
import { InspectAdminSessionRuntimeUseCase } from '../use-cases/inspect-admin-session-runtime.use-case';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/sessions')
export class AdminSessionsOperationsController {
  constructor(
    private readonly getAdminSessionsUseCase: GetAdminSessionsUseCase,
    private readonly inspectAdminSessionRuntimeUseCase: InspectAdminSessionRuntimeUseCase,
    private readonly getAdminSessionAttendanceUseCase: GetAdminSessionAttendanceUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List sessions for admin/support operations',
    description:
      'Returns paginated sessions list for operational tracking with optional status and delayed-only filtering.',
  })
  @ApiResponse({
    status: 200,
    type: AdminSessionsListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support active accounts can access this route',
  })
  list(@Query() query: ListAdminSessionsDto) {
    return this.getAdminSessionsUseCase.execute({ query });
  }

  @Get(':id/runtime-inspection')
  @ApiOperation({
    summary: 'Inspect session runtime readiness for operations',
    description:
      'Returns operational runtime readiness and provider linkage snapshot for troubleshooting session join issues.',
  })
  @ApiResponse({
    status: 200,
    type: AdminSessionRuntimeInspectionSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  inspectRuntime(@Param('id') sessionId: string) {
    return this.inspectAdminSessionRuntimeUseCase.execute({ sessionId });
  }

  @Get(':id/attendance')
  @ApiOperation({
    summary: 'Read session attendance telemetry timeline',
    description:
      'Returns persisted attendance telemetry timeline and minimal summary for admin/support operational visibility.',
  })
  @ApiResponse({ status: 200, type: AdminSessionAttendanceSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Session was not found' })
  getAttendance(@Param('id') sessionId: string) {
    return this.getAdminSessionAttendanceUseCase.execute({ sessionId });
  }
}
