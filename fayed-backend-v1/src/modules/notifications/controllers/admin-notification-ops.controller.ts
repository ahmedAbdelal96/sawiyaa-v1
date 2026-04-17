import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
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
import { ListAdminNotificationsDto } from '../dto/list-admin-notifications.dto';
import {
  NotificationOpsDetailSuccessResponseDto,
  NotificationOpsListSuccessResponseDto,
} from '../dto/notification-ops-response.dto';
import { GetAdminOperationalNotificationDetailsUseCase } from '../use-cases/get-admin-operational-notification-details.use-case';
import { ListAdminOperationalNotificationsUseCase } from '../use-cases/list-admin-operational-notifications.use-case';

@ApiTags('Admin - Notification Ops')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/notifications')
export class AdminNotificationOpsController {
  constructor(
    private readonly listAdminOperationalNotificationsUseCase: ListAdminOperationalNotificationsUseCase,
    private readonly getAdminOperationalNotificationDetailsUseCase: GetAdminOperationalNotificationDetailsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List operational notifications',
    description:
      'Admin/support operational listing for pending, queued, failed, and suppressed notification diagnostics with lightweight filtering.',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'scheduledFrom', required: false })
  @ApiQuery({ name: 'scheduledTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: NotificationOpsListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  list(@Query() query: ListAdminNotificationsDto) {
    return this.listAdminOperationalNotificationsUseCase.execute({ query });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get operational notification diagnostics details',
    description:
      'Admin/support detail endpoint for notification lifecycle state, delivery attempts, and failure/suppression reasons.',
  })
  @ApiResponse({ status: 200, type: NotificationOpsDetailSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Notification was not found' })
  details(@Param('id', new ParseUUIDPipe()) notificationId: string) {
    return this.getAdminOperationalNotificationDetailsUseCase.execute({
      notificationId,
    });
  }
}
