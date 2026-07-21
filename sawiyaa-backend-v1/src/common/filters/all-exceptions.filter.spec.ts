import { BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  it('does not route handled 400 validation errors to error logs', () => {
    const logger = {
      error: jest.fn(),
    } as never;
    const i18nService = {
      t: jest.fn((key: string) => key),
    } as never;

    const filter = new AllExceptionsFilter(i18nService, logger, {
      stackEnabled: true,
      nodeEnv: 'development',
    } as never);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as never;
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/public/practitioners?minSessionFee=abc',
      url: '/api/v1/public/practitioners?minSessionFee=abc',
      locale: 'ar',
      requestId: 'req_1',
      user: { id: 'user_1', roles: ['PATIENT'] },
      headers: {},
    } as never;
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as never;

    filter.catch(new BadRequestException('Bad Request'), host);

    expect(logger.error).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/v1/public/practitioners?minSessionFee=abc',
        requestId: 'req_1',
      }),
    );
  });

  it('routes handled 500 request errors to error logs', () => {
    const logger = {
      error: jest.fn(),
    } as never;
    const i18nService = {
      t: jest.fn((key: string) => key),
    } as never;

    const filter = new AllExceptionsFilter(i18nService, logger, {
      stackEnabled: true,
      nodeEnv: 'development',
    } as never);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as never;
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/public/practitioners',
      url: '/api/v1/public/practitioners',
      locale: 'en',
      requestId: 'req_2',
      user: { id: 'user_2', roles: ['PATIENT'] },
      headers: {},
    } as never;
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as never;

    filter.catch(new Error('Something failed'), host);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Request failed',
        statusCode: 500,
        requestId: 'req_2',
        errorName: 'Error',
        errorMessage: 'Something failed',
      }),
      undefined,
      'AllExceptionsFilter',
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/v1/public/practitioners',
        requestId: 'req_2',
      }),
    );
  });

  it('forwards safe retry metadata fields from HttpException responses', () => {
    const logger = {
      error: jest.fn(),
    } as never;
    const i18nService = {
      t: jest.fn((key: string) => key),
    } as never;

    const filter = new AllExceptionsFilter(i18nService, logger, {
      stackEnabled: true,
      nodeEnv: 'development',
    } as never);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as never;
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/auth/admin/login',
      url: '/api/v1/auth/admin/login',
      locale: 'en',
      requestId: 'req_3',
      user: { id: 'user_3', roles: ['ADMIN'] },
      headers: {},
    } as never;
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as never;

    filter.catch(
      new BadRequestException({
        messageKey: 'auth.errors.loginTemporarilyLocked',
        errorCode: 'LOGIN_TEMPORARILY_LOCKED',
        remainingAttempts: 0,
        maxAttempts: 5,
        lockedUntil: '2026-07-10T10:00:00.000Z',
        retryAfterSeconds: 60,
      }),
      host,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'LOGIN_TEMPORARILY_LOCKED',
        remainingAttempts: 0,
        maxAttempts: 5,
        lockedUntil: '2026-07-10T10:00:00.000Z',
        retryAfterSeconds: 60,
      }),
    );
  });

  it('forwards structured details payload for field-level handling', () => {
    const logger = {
      error: jest.fn(),
    } as never;
    const i18nService = {
      t: jest.fn((key: string) => key),
    } as never;

    const filter = new AllExceptionsFilter(i18nService, logger, {
      stackEnabled: true,
      nodeEnv: 'development',
    } as never);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as never;
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/admin/practitioner-applications/direct-create',
      url: '/api/v1/admin/practitioner-applications/direct-create',
      locale: 'ar',
      requestId: 'req_4',
      user: { id: 'admin_1', roles: ['ADMIN'] },
      headers: {},
    } as never;
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as never;

    filter.catch(
      new BadRequestException({
        messageKey: 'admin.practitionerApplications.errors.countryNotFound',
        error: 'COUNTRY_NOT_FOUND',
        details: [
          {
            field: 'countryCode',
            code: 'COUNTRY_NOT_FOUND',
            messageKey: 'admin.practitionerApplications.errors.countryNotFound',
          },
        ],
      }),
      host,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'COUNTRY_NOT_FOUND',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'countryCode',
            code: 'COUNTRY_NOT_FOUND',
          }),
        ]),
      }),
    );
  });
});
