import * as winston from 'winston';
import { DailyFileTransport } from './daily-file.transport';
import { formatConsoleMeta } from './logging-record.util';
import { shouldSuppressNestConsoleLog } from './logging-policy.util';

export type WinstonBootstrapOptions = {
  serviceName: string;
  nodeEnv: string;
  level: string;
  pretty: boolean;
  fileEnabled: boolean;
  consoleEnabled: boolean;
  nestInternalEnabled: boolean;
  logDir: string;
  retentionDays: number;
  maxFileSize: string;
};

function buildConsoleFormat(serviceName: string, nodeEnv: string) {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
      ({
        level,
        message,
        timestamp,
        context,
        service,
        env,
        ...meta
      }) => {
        const contextLabel = context ? `[${String(context)}]` : '[App]';
        const resolvedService = String(service ?? serviceName);
        const resolvedEnv = String(env ?? nodeEnv);
        const metaPayload = formatConsoleMeta(meta);

        return `${timestamp} ${String(level).toUpperCase()} ${contextLabel} ${String(message)} service=${resolvedService} env=${resolvedEnv}${metaPayload}`;
      },
    ),
  );
}

function addStaticMeta(serviceName: string, nodeEnv: string) {
  return winston.format((info) => ({
    ...info,
    service: serviceName,
    env: nodeEnv,
  }))();
}

function createDailyFileTransports(options: WinstonBootstrapOptions) {
  if (!options.fileEnabled) {
    return [];
  }

  return [
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'app.log',
      target: 'app',
    }),
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'http.log',
      target: 'http',
    }),
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'slow-requests.log',
      target: 'slow-requests',
    }),
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'error.log',
      target: 'error',
    }),
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'exceptions.log',
      target: 'exceptions',
    }),
  ];
}

function createConsoleTransport(options: WinstonBootstrapOptions) {
  if (!options.consoleEnabled) {
    return null;
  }

  const consoleFilter = winston.format((info) => {
    if (
      shouldSuppressNestConsoleLog({
        context: typeof info.context === 'string' ? info.context : null,
        level: typeof info.level === 'string' ? info.level : null,
        nestInternalEnabled: options.nestInternalEnabled,
      })
    ) {
      return false;
    }

    return info;
  });

  return new winston.transports.Console({
    format: options.pretty
      ? winston.format.combine(
          consoleFilter(),
          buildConsoleFormat(options.serviceName, options.nodeEnv),
        )
      : winston.format.combine(
          consoleFilter(),
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
  });
}

export function createWinstonLogger(
  options: WinstonBootstrapOptions,
): winston.Logger {
  const transports: winston.transport[] = [];
  const consoleTransport = createConsoleTransport(options);

  if (consoleTransport) {
    transports.push(consoleTransport);
  }

  transports.push(...createDailyFileTransports(options));

  return winston.createLogger({
    level: options.level,
    levels: winston.config.npm.levels,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      addStaticMeta(options.serviceName, options.nodeEnv),
    ),
    transports,
  });
}
