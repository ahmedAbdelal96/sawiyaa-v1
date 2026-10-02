import { spawn } from "node:child_process";
import process from "node:process";

const required = ["E2E_DATABASE_URL", "PRACTITIONER_OTP_QA_CAPTURE_ACCOUNTS"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`E2E backend requires local env vars: ${missing.join(", ")}`);
}

const databaseUrl = process.env.E2E_DATABASE_URL.toLowerCase();
if (!(databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1"))) {
  throw new Error("E2E_DATABASE_URL must point to a local database host");
}

// Windows Node 24 in the local runner rejects direct .cmd spawning with EINVAL;
// invoke npm through cmd.exe while keeping the command and working directory bounded
// to this test backend process.
const command = process.platform === "win32" ? "cmd.exe" : "npm";
const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run start"] : ["run", "start"];
const child = spawn(command, args, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "test",
    APP_ENV: "test",
    DATABASE_URL: process.env.E2E_DATABASE_URL,
    PORT: process.env.E2E_BACKEND_PORT ?? "7000",
    PRACTITIONER_OTP_QA_CAPTURE_ENABLED: "true",
    PRACTITIONER_OTP_QA_CAPTURE_PATH: process.env.E2E_OTP_CAPTURE_PATH ?? ".tmp/practitioner-otp-e2e.log",
  },
});

const forward = (signal) => child.kill(signal);
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
