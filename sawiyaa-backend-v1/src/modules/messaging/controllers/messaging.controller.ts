import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors, Res, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { MessagingUseCase } from '../use-cases/messaging.use-case';
import { SendMessageDto } from '../dto/send-message.dto';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('messages/conversations')
export class MessagingController {
  constructor(
    private readonly messaging: MessagingUseCase,
  ) {}

  @Get()
  list(@CurrentUser() actor: AuthenticatedUser, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.messaging.listConversations(actor, page, limit);
  }

  @Get('unread-summary')
  unreadSummary(@CurrentUser() actor: AuthenticatedUser) {
    return this.messaging.getUnreadSummary(actor);
  }

  @Get(':conversationId')
  get(@CurrentUser() actor: AuthenticatedUser, @Param('conversationId') id: string) {
    return this.messaging.getConversation(actor, id);
  }

  @Get(':conversationId/messages')
  messages(@CurrentUser() actor: AuthenticatedUser, @Param('conversationId') id: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.messaging.listMessages(actor, id, page, limit);
  }

  @Post(':conversationId/messages')
  send(@CurrentUser() actor: AuthenticatedUser, @Param('conversationId') id: string, @Body() body: SendMessageDto) {
    return this.messaging
      .sendMessage(actor, id, body.message ?? '', body.attachments ?? [], body.clientMessageId)
      .then((result) => ({ item: result.item }));
  }

  @Post(':conversationId/read')
  read(@CurrentUser() actor: AuthenticatedUser, @Param('conversationId') id: string, @Body() body: { lastReadMessageId?: string }) {
    return this.messaging.markRead(actor, id, body.lastReadMessageId ?? '');
  }

  @Post(':conversationId/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  async upload(@CurrentUser() actor: AuthenticatedUser, @Param('conversationId') id: string, @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number; originalname?: string }) {
    if (!file) return this.messaging.uploadAttachment(actor, id, file as never);
    return { item: await this.messaging.uploadAttachment(actor, id, file) };
  }

  @Get(':conversationId/attachments/:attachmentId')
  async download(@CurrentUser() actor: AuthenticatedUser, @Param('conversationId') id: string, @Param('attachmentId') fileId: string, @Res({ passthrough: true }) response: Response) {
    const resolved = await this.messaging.resolveAttachment(actor, id, fileId);
    response.setHeader('Content-Type', resolved.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    return new StreamableFile(createReadStream(resolved.absolutePath));
  }
}
