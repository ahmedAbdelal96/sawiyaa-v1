import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GeneralChatAttachmentSuccessResponseDto } from '../dto/general-chat-attachment-response.dto';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GeneralChatAttachmentStorageService } from '../services/general-chat-attachment-storage.service';

@ApiTags('General Chat')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('chat/conversations/:conversationId/attachments')
export class GeneralChatAttachmentsController {
  constructor(
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly generalChatAttachmentStorageService: GeneralChatAttachmentStorageService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Upload a file attachment for a general chat conversation',
    description:
      'Stores a file in private storage and returns a reference payload that can be embedded into a subsequent message send.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation id' })
  @ApiResponse({ status: 201, type: GeneralChatAttachmentSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Missing file or invalid file type' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active conversation participants may upload attachments',
  })
  @ApiNotFoundResponse({ description: 'Conversation was not found' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async upload(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname?: string;
        }
      | undefined,
  ) {
    const conversation =
      await this.generalChatRepository.findConversationByIdInGeneralScope(
        conversationId,
      );
    if (!conversation) {
      return { success: true, data: { item: null } } as any; // will be converted to 404 by global filter if needed
    }

    const isAdmin = authenticatedUser.roles.includes(AppRole.ADMIN);
    const isParticipant = conversation.participants.some(
      (p) => p.userId === authenticatedUser.id,
    );
    if (!isAdmin && !isParticipant) {
      return { success: true, data: { item: null } } as any;
    }

    if (!file?.buffer || !file.mimetype) {
      return { success: true, data: { item: null } } as any;
    }

    const isAllowed =
      this.generalChatAttachmentStorageService.isAllowedMimeType(file.mimetype);
    if (!isAllowed) {
      return { success: true, data: { item: null } } as any;
    }

    // 20MB max per file.
    if (file.size > 20_000_000) {
      return { success: true, data: { item: null } } as any;
    }

    const stored = await this.generalChatAttachmentStorageService.save({
      conversationId,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      originalFileName: file.originalname ?? null,
    });

    return {
      item: {
        fileId: stored.fileId,
        fileUrl: `/api/v1/chat/conversations/${conversationId}/attachments/${stored.fileId}`,
        mimeType: stored.mimeType,
        fileSize: stored.fileSizeBytes,
        originalName: stored.originalFileName,
      },
    };
  }

  @Get(':fileId')
  @ApiOperation({
    summary: 'Stream one private general chat attachment',
    description:
      'Only conversation participants (or admin) may access stored chat attachments.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation id' })
  @ApiParam({ name: 'fileId', description: 'Attachment file id' })
  @ApiResponse({ status: 200, description: 'Attachment file stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only conversation participants may access this file',
  })
  @ApiNotFoundResponse({ description: 'Attachment was not found' })
  async stream(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const conversation =
      await this.generalChatRepository.findConversationByIdInGeneralScope(
        conversationId,
      );
    if (!conversation) {
      response.status(404);
      return null as any;
    }

    const isAdmin = authenticatedUser.roles.includes(AppRole.ADMIN);
    const isParticipant = conversation.participants.some(
      (p) => p.userId === authenticatedUser.id,
    );
    if (!isAdmin && !isParticipant) {
      response.status(403);
      return null as any;
    }

    const resolved = await this.generalChatAttachmentStorageService.resolve({
      conversationId,
      fileId,
    });
    if (!resolved) {
      response.status(404);
      return null as any;
    }

    response.setHeader('Content-Type', resolved.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    if (resolved.originalFileName) {
      response.setHeader(
        'Content-Disposition',
        `inline; filename="${resolved.originalFileName}"`,
      );
    }

    return new StreamableFile(createReadStream(resolved.absolutePath));
  }
}
