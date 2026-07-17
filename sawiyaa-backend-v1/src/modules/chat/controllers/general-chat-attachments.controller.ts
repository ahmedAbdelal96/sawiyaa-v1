import {
  BadRequestException,
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
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GeneralChatAttachmentSuccessResponseDto } from '../dto/general-chat-attachment-response.dto';
import { MessagingUseCase } from '@modules/messaging/use-cases/messaging.use-case';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

@ApiTags('General Chat')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('chat/conversations/:conversationId/attachments')
export class GeneralChatAttachmentsController {
  constructor(
    private readonly messagingUseCase: MessagingUseCase,
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
    FileInterceptor('file'),
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
    if (!file) {
      throw new BadRequestException({
        messageKey: 'messages.errors.invalidAttachment',
        errorCode: 'MESSAGING_ATTACHMENT_INVALID',
      });
    }
    const stored = await this.messagingUseCase.uploadAttachment(
      authenticatedUser,
      conversationId,
      file,
      { allowLegacyAdmin: true },
    );

    return {
      item: {
        fileId: stored.fileId,
        fileUrl: `/api/v1/chat/conversations/${conversationId}/attachments/${stored.fileId}`,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        originalName: stored.originalName,
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
    const resolved = await this.messagingUseCase.resolveAttachment(
      authenticatedUser,
      conversationId,
      fileId,
      { allowLegacyAdmin: true },
    );

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
