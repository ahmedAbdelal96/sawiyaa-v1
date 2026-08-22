import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { MessagingUseCase } from '../use-cases/messaging.use-case';
import { SendMessageDto } from '../dto/send-message.dto';
import { HARD_UPLOAD_CEILING_BYTES } from '@modules/files/file.types';
import { setStoredFileResponseHeaders } from '@modules/files/file-response.utils';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('messages/conversations')
export class MessagingController {
  constructor(private readonly messaging: MessagingUseCase) {}

  @Get()
  list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messaging.listConversations(actor, page, limit);
  }

  @Get('unread-summary')
  unreadSummary(@CurrentUser() actor: AuthenticatedUser) {
    return this.messaging.getUnreadSummary(actor);
  }

  @Get('attachment-policy')
  attachmentPolicy() {
    return this.messaging.getAttachmentPolicy();
  }

  @Get(':conversationId')
  get(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('conversationId') id: string,
  ) {
    return this.messaging.getConversation(actor, id);
  }

  @Get(':conversationId/messages')
  messages(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('conversationId') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.messaging.listMessages(actor, id, page, limit);
  }

  @Post(':conversationId/messages')
  send(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('conversationId') id: string,
    @Body() body: SendMessageDto,
  ) {
    return this.messaging
      .sendMessage(
        actor,
        id,
        body.message ?? '',
        body.attachments ?? [],
        body.clientMessageId,
      )
      .then((result) => ({ item: result.item }));
  }

  @Post(':conversationId/read')
  read(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('conversationId') id: string,
    @Body() body: { lastReadMessageId?: string },
  ) {
    return this.messaging.markRead(actor, id, body.lastReadMessageId ?? '');
  }

  @Post(':conversationId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: HARD_UPLOAD_CEILING_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  async upload(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('conversationId') id: string,
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype: string;
      size: number;
      originalname?: string;
    },
  ) {
    if (!file) return this.messaging.uploadAttachment(actor, id, file as never);
    return { item: await this.messaging.uploadAttachment(actor, id, file) };
  }

  @Get(':conversationId/attachments/:attachmentId')
  async download(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('conversationId') id: string,
    @Param('attachmentId') fileId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const resolved = await this.messaging.resolveAttachment(actor, id, fileId);
    setStoredFileResponseHeaders(response, {
      mimeType: resolved.mimeType,
      originalFileName: resolved.originalFileName,
      isPrivate: true,
    });
    // Expo Web runs on a separate development origin. Keep this private
    // attachment authenticated while allowing the browser to consume the
    // response through the configured CORS allowlist.
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return new StreamableFile(createReadStream(resolved.absolutePath));
  }
}
