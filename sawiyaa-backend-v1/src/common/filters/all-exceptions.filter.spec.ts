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
});
