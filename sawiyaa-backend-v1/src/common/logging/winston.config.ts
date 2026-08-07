import * as winston from 'winston';
import { DailyFileTransport } from './daily-file.transport';
import {
  formatConsoleMeta,
  formatHttpConsoleSummary,
} from './logging-record.util';
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
  maxFileSizeBytes: number;
  version?: string;
  deploymentId?: string | null;
};

function buildConsoleFormat(serviceName: string, nodeEnv: string) {
  const displayValue = (value: unknown, fallback: string): string =>
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : fallback;

  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(
      ({ level, message, timestamp, context, service, env, ...meta }) => {
        const contextLabel = context
          ? `[${displayValue(context, 'App')}]`
          : '[App]';
        const resolvedService = displayValue(service, serviceName);
        const resolvedEnv = displayValue(env, nodeEnv);
        const httpSummary = formatHttpConsoleSummary(
          meta,
          process.env.NO_COLOR === undefined && Boolean(process.stdout.isTTY),
        );
        const metaPayload = httpSummary || formatConsoleMeta(meta);

        return `${displayValue(timestamp, '')} ${displayValue(level, 'INFO').toUpperCase()} ${contextLabel} ${displayValue(message, '')} service=${resolvedService} env=${resolvedEnv}${metaPayload}`;
      },
    ),
  );
}

function addStaticMeta(
  serviceName: string,
  nodeEnv: string,
  version = '0.0.0',
  deploymentId: string | null = null,
) {
  return winston.format((info) => ({
    ...info,
    service: serviceName,
    env: nodeEnv,
    environment: nodeEnv,
    version,
    ...(deploymentId ? { deploymentId } : {}),
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
      level: options.level,
      maxFileSizeBytes: options.maxFileSizeBytes,
    }),
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'http.log',
      target: 'http',
      level: 'silly',
      maxFileSizeBytes: options.maxFileSizeBytes,
    }),
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'slow-requests.log',
      target: 'slow-requests',
      level: 'silly',
      maxFileSizeBytes: options.maxFileSizeBytes,
    }),
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'error.log',
      target: 'error',
      level: 'silly',
      maxFileSizeBytes: options.maxFileSizeBytes,
    }),
    new DailyFileTransport({
      baseDir: options.logDir,
      retentionDays: options.retentionDays,
      fileName: 'exceptions.log',
      target: 'exceptions',
      level: 'silly',
      maxFileSizeBytes: options.maxFileSizeBytes,
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
    level: options.level,
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
    // Let each transport apply its own threshold. This keeps app.log aligned
    // with LOG_LEVEL while allowing HTTP and error files to remain complete.
    level: 'silly',
    levels: winston.config.npm.levels,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      addStaticMeta(
        options.serviceName,
        options.nodeEnv,
        options.version,
        options.deploymentId,
      ),
    ),
    transports,
  });
}
