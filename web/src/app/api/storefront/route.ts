import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../lib/server/routeUtils";
import { getStorefrontPayload } from "../../../lib/server/catalog";

export const GET = withApiHandler(async () => {
  const payload = await getStorefrontPayload();
  return jsonOk(payload);
});
