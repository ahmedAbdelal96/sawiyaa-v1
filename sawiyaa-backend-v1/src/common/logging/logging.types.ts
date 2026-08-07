export type LogFileName =
  | 'app.log'
  | 'http.log'
  | 'slow-requests.log'
  | 'error.log'
  | 'exceptions.log';

export type LogTarget =
  | 'app'
  | 'http'
  | 'slow-requests'
  | 'error'
  | 'exceptions';

export type LogRecord = Record<string, unknown> & {
  timestamp?: string;
  level?: string;
  message?: string;
  context?: string;
  targets?: LogTarget[];
  fileEnabled?: boolean;
  service?: string;
  env?: string;
  appName?: string;
  environment?: string;
  loggingTarget?: LogTarget;
  statusCode?: number;
  outcome?: string;
  failureClass?: string;
  statusFamily?: string;
  isSlow?: boolean;
  module?: string;
  operation?: string;
  correlationId?: string;
  version?: string;
  deploymentId?: string;
};
