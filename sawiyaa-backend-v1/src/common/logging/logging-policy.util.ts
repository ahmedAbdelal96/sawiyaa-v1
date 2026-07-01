const NEST_INTERNAL_CONTEXTS = new Set([
  'InstanceLoader',
  'RouterExplorer',
  'RoutesResolver',
  'NestApplication',
  'NestFactory',
  'WebSocketsController',
]);

const PRESERVED_CONSOLE_CONTEXTS = new Set([
  'NestFactory',
  'NestApplication',
  'Bootstrap',
  'PrismaService',
]);

export function isNestInternalContext(context?: string | null): boolean {
  return Boolean(context && NEST_INTERNAL_CONTEXTS.has(context));
}

export function shouldSuppressNestConsoleLog(input: {
  context?: string | null;
  level?: string | null;
  nestInternalEnabled: boolean;
}): boolean {
  if (input.nestInternalEnabled) {
    return false;
  }

  const level = input.level?.toLowerCase() ?? '';
  if (level === 'error' || level === 'warn') {
    return false;
  }

  const context = input.context?.trim() ?? '';
  if (!context) {
    return false;
  }

  if (PRESERVED_CONSOLE_CONTEXTS.has(context)) {
    return false;
  }

  return NEST_INTERNAL_CONTEXTS.has(context);
}
