import { readFileSync } from 'node:fs';
import path from 'node:path';

const FALLBACK_SERVICE_NAME = 'sawiyaa-backend-v1';

let cachedServiceName: string | null = null;

function readPackageName(): string | null {
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      name?: unknown;
    };

    return typeof packageJson.name === 'string' &&
      packageJson.name.trim().length > 0
      ? packageJson.name.trim()
      : null;
  } catch {
    return null;
  }
}

export function resolveServiceName(): string {
  if (cachedServiceName) {
    return cachedServiceName;
  }

  const envServiceName = process.env.SERVICE_NAME?.trim();
  if (envServiceName) {
    cachedServiceName = envServiceName;
    return cachedServiceName;
  }

  const packageName = readPackageName();
  if (packageName) {
    cachedServiceName = packageName;
    return cachedServiceName;
  }

  cachedServiceName = FALLBACK_SERVICE_NAME;
  return cachedServiceName;
}

export function resetServiceNameCache(): void {
  cachedServiceName = null;
}
