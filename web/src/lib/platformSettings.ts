import { getApiBaseUrl } from "./config";

export type RewardSettings = {
  enabled: boolean;
  earningRate: number;
  pointValue: number;
};

export type PlatformSettings = {
  maintenanceMode: boolean;
  minOrderThreshold: number;
  freeDeliveryThreshold: number;
  rewardSettings: RewardSettings;
};

export const INITIAL_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  minOrderThreshold: 100,
  freeDeliveryThreshold: 200,
  rewardSettings: {
    enabled: true,
    earningRate: 5,
    pointValue: 1,
  },
};

let cachedSettings: PlatformSettings | null = null;

export function getPlatformSettings(): PlatformSettings {
  return cachedSettings || INITIAL_SETTINGS;
}

export async function loadPlatformSettings(): Promise<PlatformSettings> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/settings`, { credentials: "include" });
    if (!res.ok) return INITIAL_SETTINGS;
    const data = await res.json();
    cachedSettings = {
      ...INITIAL_SETTINGS,
      ...data.settings,
      rewardSettings: {
        ...INITIAL_SETTINGS.rewardSettings,
        ...(data.settings?.rewardSettings || {}),
      },
    };
    return cachedSettings;
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function setPlatformSettings(settings: PlatformSettings): void {
  cachedSettings = settings;
}

export function pointsEarnedForOrder(totalAmount: number, settings: PlatformSettings = getPlatformSettings()): number {
  if (!settings.rewardSettings.enabled) return 0;
  const rate = Math.max(0, settings.rewardSettings.earningRate || 0);
  return Math.floor((Math.max(0, totalAmount) / 100) * rate);
}

export function rupeesFromPoints(points: number, settings: PlatformSettings = getPlatformSettings()): number {
  return Math.max(0, points) * Math.max(0, settings.rewardSettings.pointValue || 0);
}
