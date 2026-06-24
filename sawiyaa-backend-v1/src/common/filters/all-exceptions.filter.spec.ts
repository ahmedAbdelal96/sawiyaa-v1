import { ConflictException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  it('redacts sensitive query params from exception logs and response paths', () => {
    const logger = {
      error: jest.fn(),
    } as never;
    const i18nService = {
      t: jest.fn((key: string) => key),
    } as never;

    const filter = new AllExceptionsFilter(i18nService, logger);

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as never;
    const request = {
      method: 'GET',
      originalUrl:
        '/academy/enrollments/enrollment_1/payment-return?token=abc123&payment_token=pay_1&hmac=hash&publicAccessToken=pub_1&foo=bar',
      url: '/academy/enrollments/enrollment_1/payment-return?token=abc123',
      locale: 'ar',
      requestId: 'req_1',
      user: { id: 'user_1' },
      headers: {},
    } as never;
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as never;

    filter.catch(
      new ConflictException({
        messageKey: 'academy.errors.conflict',
        error: 'ACADEMY_CONFLICT',
      }),
      host,
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/academy/enrollments/enrollment_1/payment-return?token=%5BREDACTED%5D&payment_token=%5BREDACTED%5D&hmac=%5BREDACTED%5D&publicAccessToken=%5BREDACTED%5D&foo=bar',
      }),
      expect.any(String),
      'AllExceptionsFilter',
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/academy/enrollments/enrollment_1/payment-return?token=%5BREDACTED%5D&payment_token=%5BREDACTED%5D&hmac=%5BREDACTED%5D&publicAccessToken=%5BREDACTED%5D&foo=bar',
      }),
    );
  });
});
