const loggerMock = {
  log: jest.fn(),
};

jest.mock('./winston.config', () => ({
  createWinstonLogger: jest.fn(() => loggerMock),
}));

import { AppLoggerService } from './app-logger.service';

describe('AppLoggerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suppresses Nest internal file writes when the flag is disabled', () => {
    const service = new AppLoggerService(
      {
        serviceName: 'sawiyaa-backend-v1',
        name: 'sawiyaa-backend-v1',
      } as never,
      {
        nodeEnv: 'development',
        level: 'info',
        pretty: true,
        fileEnabled: true,
        consoleEnabled: true,
        stackEnabled: true,
        nestInternalEnabled: false,
        logDir: 'logs',
        retentionDays: 30,
        maxFileSize: '20m',
      } as never,
    );

    service.log('Module ready', 'InstanceLoader');

    expect(loggerMock.log).toHaveBeenCalledWith(
      'info',
      'Module ready',
      expect.objectContaining({
        context: 'InstanceLoader',
        targets: ['app'],
        fileEnabled: false,
      }),
    );
  });

  it('routes unhandled exceptions to exceptions targets by default', () => {
    const service = new AppLoggerService(
      {
        serviceName: 'sawiyaa-backend-v1',
        name: 'sawiyaa-backend-v1',
      } as never,
      {
        nodeEnv: 'development',
        level: 'info',
        pretty: true,
        fileEnabled: true,
        consoleEnabled: true,
        stackEnabled: true,
        nestInternalEnabled: false,
        logDir: 'logs',
        retentionDays: 30,
        maxFileSize: '20m',
      } as never,
    );

    service.exception(
      {
        name: 'Error',
        message: 'Boom',
      },
      'Process',
    );

    expect(loggerMock.log).toHaveBeenCalledWith(
      'error',
      'Boom',
      expect.objectContaining({
        context: 'Process',
        targets: ['app', 'exceptions'],
      }),
    );
  });
});
