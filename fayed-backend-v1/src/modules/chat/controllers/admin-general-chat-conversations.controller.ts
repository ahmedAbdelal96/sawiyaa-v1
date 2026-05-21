import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { DisableAdminGeneralChatConversationDto } from '../dto/admin-general-chat-moderation.dto';
import { ListAdminGeneralChatConversationsDto } from '../dto/admin-general-chat-query.dto';
import {
  AdminGeneralChatConversationDetailSuccessResponseDto,
  AdminGeneralChatConversationListSuccessResponseDto,
  AdminGeneralChatMessageListSuccessResponseDto,
} from '../dto/admin-general-chat-response.dto';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { DisableAdminGeneralChatConversationUseCase } from '../use-cases/disable-admin-general-chat-conversation.use-case';
import { EnableAdminGeneralChatConversationUseCase } from '../use-cases/enable-admin-general-chat-conversation.use-case';
import { GetAdminGeneralChatConversationUseCase } from '../use-cases/get-admin-general-chat-conversation.use-case';
import { ListAdminGeneralChatConversationsUseCase } from '../use-cases/list-admin-general-chat-conversations.use-case';
import { ListAdminGeneralChatMessagesUseCase } from '../use-cases/list-admin-general-chat-messages.use-case';
import { StreamAdminGeneralChatAttachmentUseCase } from '../use-cases/stream-admin-general-chat-attachment.use-case';
import { EnableAdminGeneralChatConversationDto } from '../dto/admin-general-chat-moderation.dto';
import { ListGeneralChatMessagesDto } from '../dto/list-general-chat-messages.dto';

@ApiTags('Admin - Chat')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.SUPPORT_AGENT)
@Controller('admin/chat/conversations')
export class AdminGeneralChatConversationsController {
  constructor(
    private readonly listAdminGeneralChatConversationsUseCase: ListAdminGeneralChatConversationsUseCase,
    private readonly getAdminGeneralChatConversationUseCase: GetAdminGeneralChatConversationUseCase,
    private readonly listAdminGeneralChatMessagesUseCase: ListAdminGeneralChatMessagesUseCase,
    private readonly streamAdminGeneralChatAttachmentUseCase: StreamAdminGeneralChatAttachmentUseCase,
    private readonly disableAdminGeneralChatConversationUseCase: DisableAdminGeneralChatConversationUseCase,
    private readonly enableAdminGeneralChatConversationUseCase: EnableAdminGeneralChatConversationUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Get()
  @Permissions(PermissionKey.CHAT_CONVERSATIONS_READ)
  @ApiOperation({
    summary: 'List admin-reviewed session chat conversations',
    description:
      'Returns session-linked General Chat conversations with safe preview metadata and moderation state.',
  })
  @ApiResponse({
    status: 200,
    type: AdminGeneralChatConversationListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles with read permission may access',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Query() query: ListAdminGeneralChatConversationsDto,
  ) {
    return this.listAdminGeneralChatConversationsUseCase
      .execute({
        query,
      })
      .then((data) => {
        this.securityAuditService.logAsync({
          action: 'privacy.session_chat.conversation.list.admin',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'ConversationCollection',
          resourceId: null,
          targetUserId: null,
          ipAddress: this.extractIp(request),
          userAgent: request.headers?.['user-agent'],
          metadata: {
            route: 'admin/chat/conversations',
            filters: request.query,
            totalItems: data.pagination.totalItems,
          },
        });
        return { success: true as const, data };
      });
  }

  @Get(':conversationId')
  @Permissions(PermissionKey.CHAT_CONVERSATIONS_READ)
  @ApiOperation({
    summary: 'Get one admin-reviewed session chat conversation',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation id' })
  @ApiResponse({
    status: 200,
    type: AdminGeneralChatConversationDetailSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles with read permission may access',
  })
  @ApiNotFoundResponse({ description: 'Conversation was not found' })
  detail(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.getAdminGeneralChatConversationUseCase
      .execute({
        conversationId,
      })
      .then((data) => {
        this.securityAuditService.logAsync({
          action: 'privacy.session_chat.conversation.read.admin',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'Conversation',
          resourceId: conversationId,
          targetUserId: null,
          ipAddress: this.extractIp(request),
          userAgent: request.headers?.['user-agent'],
          metadata: {
            route: 'admin/chat/conversations/:conversationId',
          },
        });
        return { success: true as const, data };
      });
  }

  @Get(':conversationId/messages')
  @Permissions(PermissionKey.CHAT_CONVERSATIONS_READ)
  @ApiOperation({
    summary: 'List messages in one admin-reviewed session chat conversation',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation id' })
  @ApiResponse({
    status: 200,
    type: AdminGeneralChatMessageListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles with read permission may access',
  })
  listMessages(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query() query: ListGeneralChatMessagesDto,
  ) {
    return this.listAdminGeneralChatMessagesUseCase
      .execute({
        conversationId,
        page: query.page ?? 1,
        limit: query.limit ?? 30,
      })
      .then((data) => {
        this.securityAuditService.logAsync({
          action: 'privacy.session_chat.messages.read.admin',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'Conversation',
          resourceId: conversationId,
          targetUserId: null,
          ipAddress: this.extractIp(request),
          userAgent: request.headers?.['user-agent'],
          metadata: {
            route: 'admin/chat/conversations/:conversationId/messages',
            page: data.pagination.page,
            limit: data.pagination.limit,
            totalItems: data.pagination.totalItems,
          },
        });
        return { success: true as const, data };
      });
  }

  @Get(':conversationId/attachments/:fileId')
  @Permissions(PermissionKey.CHAT_ATTACHMENTS_READ)
  @ApiOperation({
    summary: 'Stream one attachment from an admin-reviewed session chat',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation id' })
  @ApiParam({ name: 'fileId', description: 'Attachment file id' })
  @ApiResponse({ status: 200, description: 'Attachment file stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles with attachment permission may access',
  })
  @ApiNotFoundResponse({ description: 'Attachment was not found' })
  async streamAttachment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.streamAdminGeneralChatAttachmentUseCase.execute({
      conversationId,
      fileId,
    });

    response.setHeader('Content-Type', result.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    if (result.originalFileName) {
      response.setHeader(
        'Content-Disposition',
        `inline; filename="${result.originalFileName}"`,
      );
    }

    this.securityAuditService.logAsync({
      action: 'privacy.session_chat.attachment.read.admin',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'ConversationAttachment',
      resourceId: fileId,
      targetUserId: null,
      ipAddress: this.extractIp(request),
      userAgent: request.headers?.['user-agent'],
      metadata: {
        route: 'admin/chat/conversations/:conversationId/attachments/:fileId',
        conversationId,
      },
    });

    return result.file;
  }

  @Post(':conversationId/disable')
  @Permissions(PermissionKey.CHAT_CONVERSATIONS_MODERATE)
  @ApiOperation({
    summary: 'Disable sending in one admin-reviewed session chat conversation',
  })
  @ApiBody({ type: DisableAdminGeneralChatConversationDto })
  @ApiParam({ name: 'conversationId', description: 'Conversation id' })
  @ApiResponse({
    status: 200,
    type: AdminGeneralChatConversationDetailSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles with moderate permission may access',
  })
  disable(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: DisableAdminGeneralChatConversationDto,
  ) {
    return this.disableAdminGeneralChatConversationUseCase
      .execute({
        conversationId,
        userId: currentUser.id,
        reason: body.reason,
        note: body.note,
      })
      .then((updated) => {
        this.securityAuditService.logAsync({
          action: 'privacy.session_chat.conversation.disable.admin',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'Conversation',
          resourceId: conversationId,
          targetUserId: null,
          ipAddress: this.extractIp(request),
          userAgent: request.headers?.['user-agent'],
          reason: body.reason,
          metadata: {
            route: 'admin/chat/conversations/:conversationId/disable',
            note: body.note ?? null,
            updatedAt: updated.updatedAt.toISOString(),
          },
        });
        return { success: true as const, data: { item: updated } };
      });
  }

  @Post(':conversationId/enable')
  @Permissions(PermissionKey.CHAT_CONVERSATIONS_MODERATE)
  @ApiOperation({
    summary: 'Enable sending in one admin-reviewed session chat conversation',
  })
  @ApiBody({ type: EnableAdminGeneralChatConversationDto })
  @ApiParam({ name: 'conversationId', description: 'Conversation id' })
  @ApiResponse({
    status: 200,
    type: AdminGeneralChatConversationDetailSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support roles with moderate permission may access',
  })
  enable(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: EnableAdminGeneralChatConversationDto,
  ) {
    return this.enableAdminGeneralChatConversationUseCase
      .execute({
        conversationId,
        userId: currentUser.id,
        note: body.note,
      })
      .then((updated) => {
        this.securityAuditService.logAsync({
          action: 'privacy.session_chat.conversation.enable.admin',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'Conversation',
          resourceId: conversationId,
          targetUserId: null,
          ipAddress: this.extractIp(request),
          userAgent: request.headers?.['user-agent'],
          metadata: {
            route: 'admin/chat/conversations/:conversationId/enable',
            note: body.note ?? null,
            updatedAt: updated.updatedAt.toISOString(),
          },
        });
        return { success: true as const, data: { item: updated } };
      });
  }

  private extractIp(request: AuthenticatedRequest): string | undefined {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim();
    }
    return request.socket?.remoteAddress;
  }
}
