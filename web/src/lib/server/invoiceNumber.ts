import type { Prisma } from "@prisma/client";

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `SZ-${year}-${String(sequence).padStart(6, "0")}`;
}

export async function allocateInvoiceNumber(
  tx: Prisma.TransactionClient,
  at = new Date()
): Promise<string> {
  const year = at.getFullYear();
  const counter = await tx.receiptCounter.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return formatInvoiceNumber(year, counter.lastValue);
}
