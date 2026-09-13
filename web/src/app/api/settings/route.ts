import { NextRequest } from "next/server";
import { withApiHandler, jsonOk } from "../../../lib/server/routeUtils";
import { getPlatformSettings, updatePlatformSettings } from "../../../lib/server/repository";
import { requireStaff } from "../../../lib/server/auth";

export const GET = withApiHandler(async () => {
  const settings = await getPlatformSettings();
  return jsonOk({ settings });
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  requireStaff(request, ["ADMIN"]);
  const body = await request.json();
  const settings = await updatePlatformSettings({
    ...(body.maintenanceMode != null ? { maintenanceMode: Boolean(body.maintenanceMode) } : {}),
    ...(body.minOrderThreshold != null ? { minOrderThreshold: Number(body.minOrderThreshold) } : {}),
    ...(body.freeDeliveryThreshold != null ? { freeDeliveryThreshold: Number(body.freeDeliveryThreshold) } : {}),
    ...(body.deliveryCharge != null ? { deliveryCharge: Number(body.deliveryCharge) } : {}),
    ...(body.rewardEnabled != null ? { rewardEnabled: Boolean(body.rewardEnabled) } : {}),
    ...(body.rewardEarningRate != null ? { rewardEarningRate: Number(body.rewardEarningRate) } : {}),
    ...(body.rewardPointValue != null ? { rewardPointValue: Number(body.rewardPointValue) } : {}),
    ...(body.businessName !== undefined ? { businessName: body.businessName ? String(body.businessName) : null } : {}),
    ...(body.businessTagline !== undefined ? { businessTagline: body.businessTagline ? String(body.businessTagline) : null } : {}),
    ...(body.businessAddress !== undefined ? { businessAddress: body.businessAddress ? String(body.businessAddress) : null } : {}),
    ...(body.businessPhone !== undefined ? { businessPhone: body.businessPhone ? String(body.businessPhone) : null } : {}),
    ...(body.businessEmail !== undefined ? { businessEmail: body.businessEmail ? String(body.businessEmail) : null } : {}),
    ...(body.businessGstin !== undefined ? { businessGstin: body.businessGstin ? String(body.businessGstin) : null } : {}),
  });
  return jsonOk({ settings });
});
