import { BadRequestException } from '@nestjs/common';
import { ValidateGeneralChatMessagePayloadService } from './validate-general-chat-message-payload.service';

describe('ValidateGeneralChatMessagePayloadService', () => {
  const service = new ValidateGeneralChatMessagePayloadService();

  it('rejects empty trimmed message content', () => {
    expect(() =>
      service.normalize({
        message: '   ',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid attachment mime type', () => {
    expect(() =>
      service.normalize({
        message: 'Hello',
        attachments: [
          {
            fileId: 'file_1',
            fileUrl: 'https://cdn.example.com/a.bin',
            mimeType: 'application/octet-stream',
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('normalizes valid message and metadata-only attachments', () => {
    const result = service.normalize({
      message: '  Hello  ',
      attachments: [
        {
          fileId: ' file_1 ',
          fileUrl: 'https://cdn.example.com/a.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          originalName: ' invoice.pdf ',
        },
      ],
    });

    expect(result).toEqual({
      contentText: 'Hello',
      attachments: [
        {
          fileId: 'file_1',
          fileUrl: 'https://cdn.example.com/a.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          originalName: 'invoice.pdf',
        },
      ],
    });
  });
});
