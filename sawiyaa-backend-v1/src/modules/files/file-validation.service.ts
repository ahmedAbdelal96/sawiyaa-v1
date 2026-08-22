import { BadRequestException, Injectable } from '@nestjs/common';
import * as path from 'path';
import {
  FILE_MIME_CATALOG,
  HARD_UPLOAD_CEILING_BYTES,
  SupportedFileMimeType,
} from './file.types';

@Injectable()
export class FileValidationService {
  validate(input: {
    fileBuffer: Buffer;
    mimeType: string;
    originalFileName?: string | null;
    maxBytes: number;
    allowedMimeTypes: readonly string[];
  }): { extension: string; normalizedFileName: string | null } {
    const mimeType = input.mimeType
      .trim()
      .toLowerCase() as SupportedFileMimeType;
    const extension = FILE_MIME_CATALOG[mimeType];
    if (!extension || !input.allowedMimeTypes.includes(mimeType)) {
      throw this.invalid('FILE_TYPE_NOT_ALLOWED');
    }
    if (!Buffer.isBuffer(input.fileBuffer) || input.fileBuffer.length <= 0) {
      throw this.invalid('FILE_EMPTY');
    }
    if (
      input.fileBuffer.length >
      Math.min(input.maxBytes, HARD_UPLOAD_CEILING_BYTES)
    ) {
      throw this.invalid('FILE_TOO_LARGE');
    }

    const normalizedFileName = this.normalizeOriginalFileName(
      input.originalFileName,
    );
    if (normalizedFileName) {
      const suppliedExtension = path.extname(normalizedFileName).toLowerCase();
      if (
        suppliedExtension !== extension &&
        !(extension === '.jpg' && suppliedExtension === '.jpeg')
      ) {
        throw this.invalid('FILE_EXTENSION_MISMATCH');
      }
    }

    if (!this.matchesSignature(input.fileBuffer, mimeType)) {
      throw this.invalid('FILE_SIGNATURE_INVALID');
    }

    return { extension, normalizedFileName };
  }

  normalizeOriginalFileName(value?: string | null): string | null {
    if (!value) return null;
    const basename = path.basename(String(value).replace(/\\/g, '/'));
    const sanitized = basename
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 255);
    return sanitized || null;
  }

  private matchesSignature(
    buffer: Buffer,
    mimeType: SupportedFileMimeType,
  ): boolean {
    switch (mimeType) {
      case 'image/jpeg':
        return (
          buffer.length >= 3 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[2] === 0xff
        );
      case 'image/png':
        return buffer
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          );
      case 'image/webp':
        return (
          buffer.length >= 12 &&
          buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
          buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        );
      case 'application/pdf':
        return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
      case 'text/plain':
        return (
          !buffer.includes(0) && !buffer.toString('utf8').includes('\ufffd')
        );
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.isOfficeContainer(buffer, 'word/');
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return this.isOfficeContainer(buffer, 'xl/');
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return this.isOfficeContainer(buffer, 'ppt/');
      default:
        return false;
    }
  }

  private isOfficeContainer(
    buffer: Buffer,
    requiredDirectory: string,
  ): boolean {
    if (
      buffer.length < 4 ||
      buffer.subarray(0, 4).toString('ascii') !== 'PK\u0003\u0004'
    )
      return false;
    const sample = buffer.toString('latin1');
    return (
      sample.includes('[Content_Types].xml') &&
      sample.includes(requiredDirectory)
    );
  }

  private invalid(code: string): BadRequestException {
    return new BadRequestException({
      error: code,
      messageKey: 'files.errors.invalidFile',
    });
  }
}
