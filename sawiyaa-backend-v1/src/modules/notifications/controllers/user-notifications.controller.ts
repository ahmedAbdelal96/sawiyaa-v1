import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListMyNotificationsDto } from '../dto/list-my-notifications.dto';
import {
  UserNotificationBulkReadSuccessResponseDto,
  UserNotificationFeedSuccessResponseDto,
  UserNotificationReadSuccessResponseDto,
  UserUnreadNotificationCountSuccessResponseDto,
} from '../dto/user-notifications-response.dto';
import { GetMyUnreadNotificationCountUseCase } from '../use-cases/get-my-unread-notification-count.use-case';
import { ListMyNotificationsUseCase } from '../use-cases/list-my-notifications.use-case';
import { MarkAllMyNotificationsReadUseCase } from '../use-cases/mark-all-my-notifications-read.use-case';
import { MarkMyNotificationReadUseCase } from '../use-cases/mark-my-notification-read.use-case';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('notifications/me')
export class UserNotificationsController {
  constructor(
    private readonly listMyNotificationsUseCase: ListMyNotificationsUseCase,
    private readonly getMyUnreadNotificationCountUseCase: GetMyUnreadNotificationCountUseCase,
    private readonly markMyNotificationReadUseCase: MarkMyNotificationReadUseCase,
    private readonly markAllMyNotificationsReadUseCase: MarkAllMyNotificationsReadUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List my recent notifications',
    description:
      'Returns a lightweight authenticated notification feed for the current user, ordered newest first without expensive total counts.',
  })
  @ApiResponse({ status: 200, type: UserNotificationFeedSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  async list(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: ListMyNotificationsDto,
  ) {
    const data = await this.listMyNotificationsUseCase.execute({
      authenticatedUser,
      query,
    });

    return {
      success: true as const,
      data,
    };
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get my unread notification count',
    description:
      'Returns the authenticated user unread in-app notification count with a lightweight count query.',
  })
  @ApiResponse({
    status: 200,
    type: UserUnreadNotificationCountSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  async unreadCount(@CurrentUser() authenticatedUser: AuthenticatedUser) {
    const data = await this.getMyUnreadNotificationCountUseCase.execute({
      authenticatedUser,
    });

    return {
      success: true as const,
      data,
    };
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark one of my notifications as read',
    description:
      'Marks one authenticated-user notification as read in an idempotent way.',
  })
  @ApiParam({ name: 'id', description: 'Notification id' })
  @ApiResponse({ status: 200, type: UserNotificationReadSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The requested notification does not belong to the authenticated user',
  })
  @ApiNotFoundResponse({ description: 'Notification was not found' })
  async markRead(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') notificationId: string,
  ) {
    const data = await this.markMyNotificationReadUseCase.execute({
      authenticatedUser,
      notificationId,
    });

    return {
      success: true as const,
      data,
    };
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark my unread notifications as read',
    description:
      'Marks all current authenticated user unread in-app notifications as read using a bulk update.',
  })
  @ApiResponse({
    status: 200,
    type: UserNotificationBulkReadSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'The authenticated session is not allowed to access this route',
  })
  async markAllRead(@CurrentUser() authenticatedUser: AuthenticatedUser) {
    const data = await this.markAllMyNotificationsReadUseCase.execute({
      authenticatedUser,
    });

    return {
      success: true as const,
      data,
    };
  }
}
