import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

/**
 * GoogleIdentityService verifies Google ID tokens and extracts the identity claims needed for patient auth.
 * The module keeps this external verification isolated so patient registration logic stays readable.
 */
@Injectable()
export class GoogleIdentityService {
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  async verifyIdToken(idToken: string) {
    const clientId = this.configService.get<string>('auth.google.clientId');

    if (!clientId) {
      throw new BadRequestException({
        messageKey: 'auth.errors.googleAuthNotConfigured',
        error: 'GOOGLE_AUTH_NOT_CONFIGURED',
      });
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new BadRequestException({
        messageKey: 'auth.errors.googleIdentityInvalid',
        error: 'GOOGLE_IDENTITY_INVALID',
      });
    }

    return {
      providerSubject: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified ?? false,
      displayName: payload.name ?? null,
    };
  }
}
