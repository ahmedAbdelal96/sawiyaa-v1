'use strict';

const { validate } = require('../dist/config/validation/env.schema.js');

try {
  validate(process.env);
  process.stdout.write('RUNTIME_CONFIG_VALID\n');
} catch (error) {
  process.stderr.write('RUNTIME_CONFIG_INVALID\n');
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Environment validation failed'}\n`,
  );
  process.exitCode = 1;
}
