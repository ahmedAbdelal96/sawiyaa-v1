import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Response } from 'express';

/**
 * Extracts the Express Response object so callers can set cookies directly.
 * Use alongside @Res({ passthrough: true }) on the controller method parameter.
 *
 * @example
 * async login(@Res({ passthrough: true }) res: Response) {
 *   res.cookie('name', 'value', { httpOnly: true });
 *   return result;
 * }
 */
export const CookieRes = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Response => {
    return ctx.switchToHttp().getResponse<Response>();
  },
);
