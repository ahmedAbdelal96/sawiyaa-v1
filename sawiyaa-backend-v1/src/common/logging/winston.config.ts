import * as winston from 'winston';

export type WinstonBootstrapOptions = {
  appName: string;
  nodeEnv: string;
  level: string;
  pretty: boolean;
};

function buildDevFormat(appName: string) {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
      const metaPayload = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : '';
      const contextLabel = context ? `[${String(context)}]` : `[${appName}]`;
      return `${timestamp} ${level} ${contextLabel} ${String(message)}${metaPayload}`;
    }),
  );
}

function buildProdFormat(appName: string, nodeEnv: string) {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format((info) => ({
      ...info,
      appName,
      environment: nodeEnv,
    }))(),
    winston.format.json(),
  );
}

export function createWinstonLogger(
  options: WinstonBootstrapOptions,
): winston.Logger {
  return winston.createLogger({
    level: options.level,
    levels: winston.config.npm.levels,
    format: options.pretty
      ? buildDevFormat(options.appName)
      : buildProdFormat(options.appName, options.nodeEnv),
    transports: [new winston.transports.Console()],
  });
}
