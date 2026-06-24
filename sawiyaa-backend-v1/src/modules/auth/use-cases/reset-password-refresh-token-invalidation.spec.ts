import { UnauthorizedException } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { RefreshAuthSessionUseCase } from './refresh-auth-session.use-case';

describe('ResetPasswordRefreshTokenInvalidation', () => {
  const authTokenService = {
    verifyRefreshToken: jest.fn(),
    issueTokens: jest.fn(),
  } as any;

  const authSessionService = {
    assertRefreshTokenMatches: jest.fn(),
    rotate: jest.fn(),
  } as any;

  const authUserContextMapper = {
    toResponse: jest.fn(),
  } as any;

  const useCase = new RefreshAuthSessionUseCase(
    authTokenService,
    authSessionService,
    authUserContextMapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an old refresh token after reset bumped tokenVersion', async () => {
    authTokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      role: UserRoleType.PATIENT,
      sessionId: 'session-1',
      tokenVersion: 2,
    });

    authSessionService.assertRefreshTokenMatches.mockResolvedValue({
      user: {
        tokenVersion: 3,
        roles: [{ role: UserRoleType.PATIENT }],
      },
    });

    let caught: unknown = null;
    try {
      await useCase.execute({
        refreshToken: 'old-refresh-token',
        expectedRoles: [UserRoleType.PATIENT],
        deviceContext: {
          deviceId: 'device-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(UnauthorizedException);
    expect(caught).toMatchObject({
      response: expect.objectContaining({
        error: 'TOKEN_VERSION_INVALID',
      }),
    });
  });
});
