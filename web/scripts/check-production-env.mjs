#!/usr/bin/env node
/**
 * Warns when required production environment variables are missing.
 * Set STRICT_PRODUCTION=1 to fail the process (useful in CI deploy gates).
 */

const required = [
  "DATABASE_URL",
  "STAFF_BOOTSTRAP_PASSWORD",
  "STAFF_SESSION_SECRET",
  "PAYMENT_HMAC_SECRET",
];

const paymentOrHmac = ["PAYMENT_HMAC_SECRET", "RAZORPAY_KEY_SECRET"];

function missing(name) {
  return !process.env[name] || !String(process.env[name]).trim();
}

const issues = [];

if (missing("DATABASE_URL")) issues.push("DATABASE_URL");
if (missing("STAFF_BOOTSTRAP_PASSWORD")) issues.push("STAFF_BOOTSTRAP_PASSWORD");
if (missing("STAFF_SESSION_SECRET") && missing("PAYMENT_HMAC_SECRET")) {
  issues.push("STAFF_SESSION_SECRET (or PAYMENT_HMAC_SECRET)");
}
if (paymentOrHmac.every(missing)) {
  issues.push("PAYMENT_HMAC_SECRET or RAZORPAY_KEY_SECRET");
}

if (issues.length === 0) {
  console.log("Production environment check: OK");
  process.exit(0);
}

const message = `Production environment check: missing ${issues.join(", ")}`;
if (process.env.STRICT_PRODUCTION === "1") {
  console.error(message);
  process.exit(1);
}

console.warn(message);
process.exit(0);
