import { Decimal } from "@prisma/client/runtime/library";

export function decimalToNumber(value: Decimal | number | { toString(): string } | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function toJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v))
  ) as T;
}
