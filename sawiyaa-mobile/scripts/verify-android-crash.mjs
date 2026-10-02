import { spawnSync } from "node:child_process";
import process from "node:process";

const packageName = "com.sawiyaa.mobile";
const command = process.argv[2] ?? "check";
const allowStopped = process.argv.includes("--allow-stopped");

function adb(args, options = {}) {
  const result = spawnSync("adb", args, { encoding: "utf8", ...options });
  if (result.error) {
    throw new Error(`adb is unavailable: ${result.error.message}`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

if (command === "clear") {
  adb(["logcat", "-c"]);
  console.log("Android crash buffer cleared.");
  process.exit(0);
}

if (command !== "check") {
  console.error("Usage: node scripts/verify-android-crash.mjs [clear|check] [--allow-stopped]");
  process.exit(2);
}

const log = adb(["logcat", "-d", "-v", "brief"]);
const suspicious = log
  .split(/\r?\n/)
  .filter((line) => /com\.sawiyaa\.mobile|FATAL EXCEPTION|JavascriptException|APP CRASH\(EXCEPTION\)|SIGSEGV|SIGABRT|tombstone/i.test(line));

const processState = adb(["shell", "pidof", packageName]).trim();
const exitInfo = adb(["shell", "dumpsys", "activity", "exit-info", packageName]);
const packageExit = exitInfo
  .split(/\r?\n/)
  .filter((line) => /reason=|status=|substatus=|description=/i.test(line));
if (suspicious.length > 0) {
  console.error("Android crash gate failed. Matching logcat lines:");
  console.error(suspicious.join("\n"));
  process.exit(1);
}

if (!allowStopped && !processState) {
  console.error(`Android crash gate failed: ${packageName} is not running after the smoke flow.`);
  if (packageExit.length > 0) console.error(packageExit.join("\n"));
  process.exit(1);
}

console.log(`Android crash gate passed. ${packageName} process: ${processState}`);
