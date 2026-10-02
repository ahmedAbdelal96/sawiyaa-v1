import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve('src/config/mobile-environment.ts');
const source = fs.readFileSync(configPath, 'utf8');
const expectedUrl = 'https://sawiyaa.com/api/v1';
const declaredUrl = source.match(/PRODUCTION_API_URL\s*=\s*['"]([^'"]+)['"]/)?.[1];

if (declaredUrl !== expectedUrl) {
  throw new Error(
    `Production mobile API URL must be ${expectedUrl}; found ${declaredUrl ?? 'nothing'}.`,
  );
}

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const buildProfile = (
  process.env.EAS_BUILD_PROFILE ?? process.env.SAWIYAA_BUILD_PROFILE ?? 'production'
).toLowerCase();
const releaseProfile = new Set(['production', 'preview', 'client-preview', 'release']);

if (releaseProfile.has(buildProfile) && configuredUrl && configuredUrl !== expectedUrl) {
  throw new Error(
    `Release mobile API URL must be ${expectedUrl}; received EXPO_PUBLIC_API_URL override.`,
  );
}

console.log(`Mobile production API configuration valid: ${expectedUrl}`);
