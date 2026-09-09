import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../../lib/server/routeUtils";
import { getSearchRecommendations } from "../../../../lib/server/search";

export const GET = withApiHandler(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get("q") || "";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "8");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;
  const payload = await getSearchRecommendations(q, limit);
  return jsonOk(payload);
});
