import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs completed requests and classifies slow requests', async () => {
    const logger = {
      http: jest.fn(),
      slowRequest: jest.fn(),
    } as never;
    const interceptor = new LoggingInterceptor(logger, {
      httpEnabled: true,
      slowRequestMs: 1000,
    } as never);

    const request = {
      requestId: 'req-1',
      method: 'GET',
      originalUrl: '/api/v1/public/practitioners?foo=bar',
      url: '/api/v1/public/practitioners?foo=bar',
      user: { id: 'user-1', roles: ['PATIENT'] },
      locale: 'ar',
      headers: { 'user-agent': 'jest' },
      query: { foo: 'bar' },
      ip: '127.0.0.1',
    } as never;
    const response = { statusCode: 200 } as never;
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
      getClass: () => ({ name: 'PractitionersController' }),
      getHandler: () => ({ name: 'listPublicPractitioners' }),
    } as never;

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(1500);

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ ok: true }),
      } as never),
    );

    expect(logger.http).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'HTTP request completed',
        requestId: 'req-1',
        method: 'GET',
        path: '/api/v1/public/practitioners?foo=bar',
        statusCode: 200,
        durationMs: 1500,
        userId: 'user-1',
        role: 'PATIENT',
        locale: 'ar',
        routeController: 'PractitionersController',
        routeHandler: 'listPublicPractitioners',
      }),
      undefined,
      'LoggingInterceptor',
    );

    expect(logger.slowRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Slow HTTP request detected',
        durationMs: 1500,
      }),
      undefined,
      'LoggingInterceptor',
    );
  });

  it('logs failed requests and retains request metadata', async () => {
    const logger = {
      http: jest.fn(),
      slowRequest: jest.fn(),
    } as never;
    const interceptor = new LoggingInterceptor(logger, {
      httpEnabled: true,
      slowRequestMs: 1000,
    } as never);

    const request = {
      requestId: 'req-2',
      method: 'POST',
      originalUrl: '/api/v1/public/practitioners',
      url: '/api/v1/public/practitioners',
      user: { id: 'user-2', roles: ['PATIENT'] },
      locale: 'en',
      headers: { 'user-agent': 'jest' },
      query: {},
      ip: '127.0.0.1',
    } as never;
    const response = { statusCode: 500 } as never;
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
      getClass: () => ({ name: 'PractitionersController' }),
      getHandler: () => ({ name: 'createPublicPractitioner' }),
    } as never;

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(1200);

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => new HttpException('Nope', HttpStatus.BAD_REQUEST)),
        } as never),
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(logger.http).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'HTTP request failed',
        requestId: 'req-2',
        statusCode: 400,
        durationMs: 1200,
      }),
      undefined,
      'LoggingInterceptor',
    );

    expect(logger.slowRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Slow HTTP request failed',
        durationMs: 1200,
      }),
      undefined,
      'LoggingInterceptor',
    );
  });
});
