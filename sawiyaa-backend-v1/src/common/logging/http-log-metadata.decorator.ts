import { SetMetadata } from '@nestjs/common';

export const HTTP_LOG_METADATA_KEY = 'sawiyaa:http-log-metadata';

export interface HttpLogMetadata {
  module?: string;
  operation?: string;
}

export const HttpLog = (metadata: HttpLogMetadata) =>
  SetMetadata(HTTP_LOG_METADATA_KEY, metadata);
