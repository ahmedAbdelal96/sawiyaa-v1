const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({
  path: process.env.SAWIYAA_ENV_FILE || path.resolve(__dirname, '.env.local'),
});
const { defineConfig, env } = require('prisma/config');

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --preferTsExts prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
