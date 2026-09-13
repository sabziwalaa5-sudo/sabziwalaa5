import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "../db";
import { handleApiError, ApiError } from "./auth";

export function requireDatabase() {
  if (!isDatabaseConfigured()) {
    throw new ApiError("Database is not configured", 503);
  }
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function withApiHandler(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      requireDatabase();
      return await handler(request);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
