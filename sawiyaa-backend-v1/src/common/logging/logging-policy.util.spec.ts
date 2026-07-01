import { shouldSuppressNestConsoleLog } from './logging-policy.util';

describe('logging policy util', () => {
  it('suppresses noisy Nest startup contexts from console when disabled', () => {
    expect(
      shouldSuppressNestConsoleLog({
        context: 'InstanceLoader',
        level: 'info',
        nestInternalEnabled: false,
      }),
    ).toBe(true);

    expect(
      shouldSuppressNestConsoleLog({
        context: 'RouterExplorer',
        level: 'info',
        nestInternalEnabled: false,
      }),
    ).toBe(true);

    expect(
      shouldSuppressNestConsoleLog({
        context: 'RoutesResolver',
        level: 'info',
        nestInternalEnabled: false,
      }),
    ).toBe(true);

    expect(
      shouldSuppressNestConsoleLog({
        context: 'WebSocketsController',
        level: 'info',
        nestInternalEnabled: false,
      }),
    ).toBe(true);
  });

  it('preserves useful startup contexts and warnings/errors', () => {
    expect(
      shouldSuppressNestConsoleLog({
        context: 'Bootstrap',
        level: 'info',
        nestInternalEnabled: false,
      }),
    ).toBe(false);

    expect(
      shouldSuppressNestConsoleLog({
        context: 'PrismaService',
        level: 'info',
        nestInternalEnabled: false,
      }),
    ).toBe(false);

    expect(
      shouldSuppressNestConsoleLog({
        context: 'InstanceLoader',
        level: 'warn',
        nestInternalEnabled: false,
      }),
    ).toBe(false);

    expect(
      shouldSuppressNestConsoleLog({
        context: 'RouterExplorer',
        level: 'error',
        nestInternalEnabled: false,
      }),
    ).toBe(false);
  });

  it('allows noisy Nest startup contexts when enabled', () => {
    expect(
      shouldSuppressNestConsoleLog({
        context: 'InstanceLoader',
        level: 'info',
        nestInternalEnabled: true,
      }),
    ).toBe(false);
  });
});
