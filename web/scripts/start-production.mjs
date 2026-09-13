#!/usr/bin/env node
/**
 * Production start script for GoDaddy Node.js Hosting and similar PaaS platforms.
 * Respects PORT, HOST, and HOSTNAME environment variables.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const port = process.env.PORT || "3000";
const host = process.env.HOST || process.env.HOSTNAME || "0.0.0.0";

const nextBin = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);

const child = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", port], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
