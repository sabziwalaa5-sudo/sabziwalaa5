import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../lib/server/routeUtils";
import { getWallet, listWallets } from "../../../lib/server/repository";
import { getCustomerFromRequest, getStaffFromRequest } from "../../../lib/server/auth";

export const GET = withApiHandler(async (request: NextRequest) => {
  const staff = getStaffFromRequest(request);
  if (staff?.role === "ADMIN" && request.nextUrl.searchParams.get("all") === "true") {
    const wallets = await listWallets();
    return jsonOk({ wallets });
  }

  const customer = await getCustomerFromRequest(request);
  if (!customer) throw new Error("Unauthorized");
  const wallet = await getWallet(customer.email);
  return jsonOk({ wallet });
});
