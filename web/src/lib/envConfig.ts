import { isProduction } from "./runtime";

export type ProductionEnvIssue = {
  variable: string;
  message: string;
};

export function getProductionEnvIssues(): ProductionEnvIssue[] {
  if (!isProduction()) return [];

  const issues: ProductionEnvIssue[] = [];

  if (!process.env.STAFF_BOOTSTRAP_PASSWORD?.trim()) {
    issues.push({
      variable: "STAFF_BOOTSTRAP_PASSWORD",
      message: "Required in production for staff portal login.",
    });
  }

  if (!process.env.STAFF_SESSION_SECRET?.trim() && !process.env.PAYMENT_HMAC_SECRET?.trim()) {
    issues.push({
      variable: "STAFF_SESSION_SECRET",
      message: "Required in production to sign staff session cookies securely.",
    });
  }

  if (!process.env.PAYMENT_HMAC_SECRET?.trim() && !process.env.RAZORPAY_KEY_SECRET?.trim()) {
    issues.push({
      variable: "PAYMENT_HMAC_SECRET",
      message: "Required in production to sign checkout tokens (or set RAZORPAY_KEY_SECRET).",
    });
  }

  return issues;
}

export function assertProductionEnv(): void {
  const issues = getProductionEnvIssues();
  if (issues.length === 0) return;
  const summary = issues.map((i) => `${i.variable}: ${i.message}`).join("; ");
  throw new Error(`Missing production environment configuration: ${summary}`);
}
