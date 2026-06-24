import { InternalServerErrorException } from '@nestjs/common';
import { ConfigDataType } from '@prisma/client';

export class ConfigValueFormatException extends InternalServerErrorException {
  constructor(key: string, dataType: ConfigDataType) {
    super({
      message: `Config key "${key}" contains a value that does not match its declared data type`,
      error: 'CONFIG_VALUE_FORMAT_INVALID',
      key,
      dataType,
    });
  }
}
