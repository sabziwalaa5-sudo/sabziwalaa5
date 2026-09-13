import { isDevelopment } from "./runtime";

type LogLevel = "debug" | "info" | "warn" | "error";

function shouldLog(level: LogLevel): boolean {
  if (isDevelopment()) return true;
  return level === "warn" || level === "error";
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (!shouldLog("debug")) return;
    if (meta !== undefined) console.debug(message, meta);
    else console.debug(message);
  },
  info(message: string, meta?: unknown): void {
    if (!shouldLog("info")) return;
    if (meta !== undefined) console.info(message, meta);
    else console.info(message);
  },
  warn(message: string, meta?: unknown): void {
    if (!shouldLog("warn")) return;
    if (meta !== undefined) console.warn(message, meta);
    else console.warn(message);
  },
  error(message: string, meta?: unknown): void {
    if (!shouldLog("error")) return;
    if (meta !== undefined) console.error(message, meta);
    else console.error(message);
  },
};
