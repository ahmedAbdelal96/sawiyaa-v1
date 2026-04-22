import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
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
import {
  AdminAuditDetailSuccessResponseDto,
  AdminAuditListSuccessResponseDto,
} from '../dto/admin-audit-response.dto';
import { ListAdminAuditEventsDto } from '../dto/list-admin-audit-events.dto';
import { GetAdminAuditEventDetailsUseCase } from '../use-cases/get-admin-audit-event-details.use-case';
import { ListAdminAuditEventsUseCase } from '../use-cases/list-admin-audit-events.use-case';

@ApiTags('Admin - Audit Log')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/audit/events')
export class AdminAuditLogController {
  constructor(
    private readonly listAdminAuditEventsUseCase: ListAdminAuditEventsUseCase,
    private readonly getAdminAuditEventDetailsUseCase: GetAdminAuditEventDetailsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List audit events',
    description:
      'Admin/support operational audit timeline with bounded filtering for role, event family, source, category, and search.',
  })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'actorRole', required: false })
  @ApiQuery({ name: 'eventFamily', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'targetEntityType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: AdminAuditListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  list(@Query() query: ListAdminAuditEventsDto) {
    return this.listAdminAuditEventsUseCase.execute({ query });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get audit event details',
    description:
      'Admin/support detail endpoint for audit event snapshots and trace context.',
  })
  @ApiResponse({ status: 200, type: AdminAuditDetailSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Audit event was not found' })
  details(@Param('id', new ParseUUIDPipe()) eventId: string) {
    return this.getAdminAuditEventDetailsUseCase.execute({ eventId });
  }
}
