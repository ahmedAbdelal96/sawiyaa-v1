import { BadRequestException } from '@nestjs/common';
import { ValidateSessionDurationService } from './validate-session-duration.service';

describe('ValidateSessionDurationService', () => {
  const service = new ValidateSessionDurationService();

  it('accepts 30 and 60 minute sessions', () => {
    expect(() => service.validate(30)).not.toThrow();
    expect(() => service.validate(60)).not.toThrow();
  });

  it('rejects unsupported durations', () => {
    expect(() => service.validate(45)).toThrow(BadRequestException);
  });
});
