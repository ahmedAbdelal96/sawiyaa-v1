import { BadRequestException } from '@nestjs/common';
import { SessionMode } from '@prisma/client';
import {
  assertSupportedSessionMode,
  SUPPORTED_SESSION_MODE,
} from './session-modality.policy';

describe('session modality policy', () => {
  it('accepts VIDEO as the only sellable modality', () => {
    expect(SUPPORTED_SESSION_MODE).toBe(SessionMode.VIDEO);
    expect(() => assertSupportedSessionMode(SessionMode.VIDEO)).not.toThrow();
  });

  it.each([SessionMode.AUDIO, SessionMode.CHAT])(
    'rejects legacy %s for new sessions',
    (mode) => {
      expect(() => assertSupportedSessionMode(mode)).toThrow(
        BadRequestException,
      );
    },
  );
});
