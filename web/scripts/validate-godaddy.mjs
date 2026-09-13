#!/usr/bin/env node
/**
 * Local validator for GoDaddy Node.js Hosting deploy contract (subset).
 * See: https://github.com/godaddy/nodejs-hosting-agent-skill
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const errors = [];
const warnings = [];

function readPkg() {
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    errors.push("E001: Missing package.json");
    return null;
  }
  return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
}

const pkg = readPkg();
if (pkg) {
  if (!pkg.name?.trim() || !pkg.version?.trim()) errors.push("E007: Missing name or version");
  if (!pkg.main?.trim()) errors.push("E008: Missing main field");
  else if (!fs.existsSync(path.join(root, pkg.main))) errors.push("E008: main file not found");

  if (!pkg.scripts?.build?.trim()) errors.push("E005: Missing build script");
  if (!pkg.scripts?.start?.trim()) errors.push("E002: Missing start script");

  if (pkg.scripts?.start?.includes("-p 3001") || pkg.scripts?.start?.includes("-p3001")) {
    errors.push("E004: Hardcoded port in start script");
  }

  const runtimePkgs = ["next", "@prisma/client"];
  const buildPkgs = ["prisma"];
  for (const name of runtimePkgs) {
    if (pkg.dependencies?.[name]) continue;
    if (pkg.devDependencies?.[name]) errors.push(`E006: ${name} must be in dependencies`);
    else errors.push(`E006: Missing runtime dependency ${name}`);
  }
  for (const name of buildPkgs) {
    if (pkg.dependencies?.[name]) continue;
    if (pkg.devDependencies?.[name]) errors.push(`E006: ${name} must be in dependencies (required at build)`);
  }

  if (!pkg.engines?.node) warnings.push("W002: Missing engines.node");
}

if (!fs.existsSync(path.join(root, "package-lock.json"))) {
  warnings.push("Missing package-lock.json (upload should include lockfile)");
}
if (fs.existsSync(path.join(root, ".env")) || fs.existsSync(path.join(root, ".env.local"))) {
  warnings.push("W001: .env file present — exclude from upload");
}
if (fs.existsSync(path.join(root, "node_modules"))) {
  warnings.push("W004: node_modules present — exclude from upload");
}
if (!fs.existsSync(path.join(root, ".npmrc"))) {
  warnings.push("Missing .npmrc with public registry");
}

const startScript = path.join(root, "scripts/start-production.mjs");
if (!fs.existsSync(startScript)) {
  warnings.push("W003: start-production.mjs not found");
}

if (errors.length) {
  console.error("GoDaddy validation FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  if (warnings.length) console.error("\nWarnings:\n" + warnings.map((w) => `  - ${w}`).join("\n"));
  process.exit(1);
}

console.log("GoDaddy validation PASSED");
if (warnings.length) {
  console.log("Warnings:\n" + warnings.map((w) => `  - ${w}`).join("\n"));
}
