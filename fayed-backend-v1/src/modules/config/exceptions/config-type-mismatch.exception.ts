import { InternalServerErrorException } from '@nestjs/common';
import { ConfigDataType } from '@prisma/client';

export class ConfigTypeMismatchException extends InternalServerErrorException {
  constructor(
    key: string,
    expectedType: ConfigDataType | 'JSON_COMPATIBLE',
    actualType: ConfigDataType,
  ) {
    super({
      message: `Config key "${key}" has an incompatible type`,
      error: 'CONFIG_TYPE_MISMATCH',
      key,
      expectedType,
      actualType,
    });
  }
}
