import type { PlatformSettings } from "./platformSettings";

export function pointsEarnedForOrder(totalAmount: number, settings: PlatformSettings): number {
  if (!settings.rewardSettings.enabled) return 0;
  const rate = Math.max(0, settings.rewardSettings.earningRate || 0);
  return Math.floor((Math.max(0, totalAmount) / 100) * rate);
}

export function rupeesFromPoints(points: number, settings: PlatformSettings): number {
  return Math.max(0, points) * Math.max(0, settings.rewardSettings.pointValue || 0);
}
