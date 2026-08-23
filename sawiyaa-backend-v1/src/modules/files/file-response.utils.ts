import type { Response } from 'express';

export function setStoredFileResponseHeaders(
  response: Response,
  input: {
    mimeType: string;
    originalFileName?: string | null;
    isPrivate: boolean;
  },
): void {
  response.setHeader('Content-Type', input.mimeType);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader(
    'Cache-Control',
    input.isPrivate ? 'private, no-store' : 'public, max-age=86400',
  );
  if (input.originalFileName) {
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(input.originalFileName)}`,
    );
  }
}
