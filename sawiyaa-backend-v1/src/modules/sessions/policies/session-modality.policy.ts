import { BadRequestException } from '@nestjs/common';
import { SessionMode } from '@prisma/client';

export const SUPPORTED_SESSION_MODE = SessionMode.VIDEO;

/** AUDIO/CHAT remain in persistence for historical compatibility only. */
export function assertSupportedSessionMode(
  sessionMode: SessionMode,
): asserts sessionMode is 'VIDEO' {
  if (sessionMode !== SUPPORTED_SESSION_MODE) {
    throw new BadRequestException({
      messageKey: 'sessions.errors.invalidSessionMode',
      error: 'SESSION_MODE_NOT_SUPPORTED',
      messageParams: { supportedMode: SUPPORTED_SESSION_MODE },
    });
  }
}
