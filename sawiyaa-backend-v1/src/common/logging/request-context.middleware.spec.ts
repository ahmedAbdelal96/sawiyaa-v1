import { RequestContextMiddleware } from './request-context.middleware';

describe('RequestContextMiddleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reuses an incoming x-request-id header', () => {
    const middleware = new RequestContextMiddleware();
    const response = { setHeader: jest.fn() } as never;
    const next = jest.fn();
    const request = {
      headers: { 'x-request-id': '  req-123  ' },
    } as never;

    middleware.use(request, response, next);

    expect(request.requestId).toBe('req-123');
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'req-123');
    expect(next).toHaveBeenCalled();
  });

  it('generates a request id when the header is missing', () => {
    const middleware = new RequestContextMiddleware();
    const response = { setHeader: jest.fn() } as never;
    const next = jest.fn();
    const request = {
      headers: {},
    } as never;

    middleware.use(request, response, next);

    expect(typeof request.requestId).toBe('string');
    expect(request.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', request.requestId);
    expect(next).toHaveBeenCalled();
  });
});
