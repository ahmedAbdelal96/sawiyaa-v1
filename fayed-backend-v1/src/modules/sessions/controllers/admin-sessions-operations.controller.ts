import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionCancellationBookingType } from '@prisma/client';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminSessionAttendanceSuccessResponseDto } from '../dto/admin-session-attendance-response.dto';
import { AdminSessionsListSuccessResponseDto } from '../dto/admin-sessions-list-response.dto';
import { ListAdminSessionsDto } from '../dto/list-admin-sessions.dto';
import { AdminSessionRuntimeInspectionSuccessResponseDto } from '../dto/admin-session-ops-response.dto';
import { GetAdminSessionAttendanceUseCase } from '../use-cases/get-admin-session-attendance.use-case';
import { GetAdminSessionsUseCase } from '../use-cases/get-admin-sessions.use-case';
import { InspectAdminSessionRuntimeUseCase } from '../use-cases/inspect-admin-session-runtime.use-case';
import {
  SessionCancellationPolicySuccessResponseDto,
  SessionCancellationPoliciesSuccessResponseDto,
  UpdateSessionCancellationPolicyDto,
} from '../dto/session-cancellation-policy.dto';
import { GetSessionCancellationPoliciesUseCase } from '../use-cases/get-session-cancellation-policies.use-case';
import { UpdateSessionCancellationPolicyUseCase } from '../use-cases/update-session-cancellation-policy.use-case';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/sessions')
// TODO(Phase-4): SUPPORT_AGENT has `sessions.read.supportSummary` permission.
// When a dedicated support-safe session summary endpoint is added it should:
// - Require PermissionKey.SESSIONS_READ_SUPPORT_SUMMARY (NOT sessions.read.admin)
// - Exclude: internal notes, clinical details, financial ledger, chat history, assessment results
// - Include only: sessionCode, status, scheduling, and basic patient/practitioner identifiers
// Until that endpoint exists, SUPPORT_AGENT cannot access any session detail via this controller
// because all GET endpoints here require sessions.read.admin (which SUPPORT_AGENT does not have).
export class AdminSessionsOperationsController {
  constructor(
    private readonly getAdminSessionsUseCase: GetAdminSessionsUseCase,
    private readonly inspectAdminSessionRuntimeUseCase: InspectAdminSessionRuntimeUseCase,
    private readonly getAdminSessionAttendanceUseCase: GetAdminSessionAttendanceUseCase,
    private readonly getSessionCancellationPoliciesUseCase: GetSessionCancellationPoliciesUseCase,
    private readonly updateSessionCancellationPolicyUseCase: UpdateSessionCancellationPolicyUseCase,
  ) {}

  @Get()
  @Permissions(PermissionKey.SESSIONS_READ_ADMIN)
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
  @Permissions(PermissionKey.SESSIONS_READ_ADMIN)
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
  @Permissions(PermissionKey.SESSIONS_READ_ADMIN)
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

  @Get('cancellation-policies')
  @Permissions(PermissionKey.SESSIONS_READ_ADMIN)
  @ApiOperation({
    summary: 'List active session cancellation policies',
    description:
      'Returns typed cancellation policy contracts with booking-type scoped rules and refund semantics.',
  })
  @ApiResponse({
    status: 200,
    type: SessionCancellationPoliciesSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support active accounts can access this route',
  })
  listCancellationPolicies() {
    return this.getSessionCancellationPoliciesUseCase.execute();
  }

  @Patch('cancellation-policies/:bookingType')
  @ApiOperation({
    summary: 'Update session cancellation policy',
    description:
      'Replaces booking-type policy rules with validated, non-overlapping windows and typed refund behavior.',
  })
  @ApiParam({
    name: 'bookingType',
    enum: SessionCancellationBookingType,
  })
  @ApiBody({ type: UpdateSessionCancellationPolicyDto })
  @ApiResponse({
    status: 200,
    type: SessionCancellationPolicySuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support active accounts can access this route',
  })
  @ApiNotFoundResponse({ description: 'Policy for booking type was not found' })
  @ApiConflictResponse({
    description: 'Policy contains overlapping or invalid rule windows',
  })
  @Roles(AppRole.ADMIN)
  updateCancellationPolicy(
    @Param('bookingType', new ParseEnumPipe(SessionCancellationBookingType))
    bookingType: SessionCancellationBookingType,
    @Body() body: UpdateSessionCancellationPolicyDto,
  ) {
    return this.updateSessionCancellationPolicyUseCase.execute({
      bookingType,
      body,
    });
  }
}
