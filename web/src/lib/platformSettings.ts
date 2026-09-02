import { getStoredState, setStoredState, STATE_KEYS } from "./sharedState";

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

export function getPlatformSettings(): PlatformSettings {
  const stored = getStoredState<Partial<PlatformSettings>>(STATE_KEYS.SETTINGS, INITIAL_SETTINGS);
  return {
    ...INITIAL_SETTINGS,
    ...stored,
    rewardSettings: {
      ...INITIAL_SETTINGS.rewardSettings,
      ...(stored.rewardSettings || {}),
    },
  };
}

export function setPlatformSettings(settings: PlatformSettings): void {
  setStoredState(STATE_KEYS.SETTINGS, settings);
}

export function pointsEarnedForOrder(totalAmount: number, settings: PlatformSettings = getPlatformSettings()): number {
  if (!settings.rewardSettings.enabled) return 0;
  const rate = Math.max(0, settings.rewardSettings.earningRate || 0);
  return Math.floor((Math.max(0, totalAmount) / 100) * rate);
}

export function rupeesFromPoints(points: number, settings: PlatformSettings = getPlatformSettings()): number {
  return Math.max(0, points) * Math.max(0, settings.rewardSettings.pointValue || 0);
}
