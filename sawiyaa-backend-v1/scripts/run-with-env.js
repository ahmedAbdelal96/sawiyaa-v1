#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const envFile = process.env.SAWIYAA_ENV_FILE || path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  for (const rawLine of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/run-with-env.js <command> [args...]');
  process.exit(2);
}
const child = spawn(args[0], args.slice(1), { stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
child.on('error', (error) => { console.error(error.message); process.exit(1); });
