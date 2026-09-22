import { BadRequestException } from '@nestjs/common';
import { FileValidationService } from './file-validation.service';

describe('FileValidationService', () => {
  const service = new FileValidationService();

  it('accepts a correctly signed PNG within the configured limit', () => {
    const result = service.validate({
      purpose: 'USER_AVATAR' as never,
      fileBuffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      mimeType: 'image/png',
      originalFileName: 'avatar.png',
      maxBytes: 1024,
      allowedMimeTypes: ['image/png'],
    });

    expect(result.extension).toBe('.png');
    expect(result.normalizedFileName).toBe('avatar.png');
  });

  it('rejects a MIME-correct file with the wrong signature', () => {
    expect(() =>
      service.validate({
        purpose: 'USER_AVATAR' as never,
        fileBuffer: Buffer.from('not a png'),
        mimeType: 'image/png',
        originalFileName: 'avatar.png',
        maxBytes: 1024,
        allowedMimeTypes: ['image/png'],
      }),
    ).toThrow(BadRequestException);
  });

  it('enforces the hard parser ceiling even when a caller requests more', () => {
    expect(() =>
      service.validate({
        purpose: 'USER_AVATAR' as never,
        fileBuffer: Buffer.alloc(26 * 1024 * 1024),
        mimeType: 'image/png',
        originalFileName: 'avatar.png',
        maxBytes: 26 * 1024 * 1024,
        allowedMimeTypes: ['image/png'],
      }),
    ).toThrow(BadRequestException);
  });
});
