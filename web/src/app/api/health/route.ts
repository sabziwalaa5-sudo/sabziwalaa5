import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "../../../lib/db";

export async function GET() {
  let database: "ok" | "unconfigured" | "unavailable" = "unconfigured";

  if (isDatabaseConfigured()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "unavailable";
    }
  }

  const healthy = database !== "unavailable";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "sabjiwala-web",
      database,
    },
    { status: healthy ? 200 : 503 }
  );
}
