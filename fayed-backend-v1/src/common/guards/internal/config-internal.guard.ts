import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Internal-only guard for config endpoints.
 * It is intentionally independent from user authentication because some internal calls may be service-to-service.
 */
@Injectable()
export class ConfigInternalGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const isHttpEnabled = this.configService.get<string>(
      'http.enabled',
      'false',
    );

    if (isHttpEnabled !== 'true') {
      throw new NotFoundException();
    }

    const expectedToken = this.configService.get<string>('http.token');

    if (!expectedToken) {
      throw new ForbiddenException({
        message:
          'Config endpoint is disabled until an internal token is configured',
        error: 'CONFIG_ENDPOINT_TOKEN_MISSING',
      });
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const providedToken = request.headers['x-config-internal-token'];
    const normalizedToken = Array.isArray(providedToken)
      ? providedToken[0]
      : providedToken;

    if (normalizedToken !== expectedToken) {
      throw new ForbiddenException({
        message: 'Config endpoint is internal-only',
        error: 'CONFIG_ENDPOINT_FORBIDDEN',
      });
    }

    return true;
  }
}
