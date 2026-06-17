import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const DEVICE_ID_KEY = "waslaeuftin_device_id";

interface DeviceState {
  // Stable, anonymous, client-generated device identifier. `null` until the
  // SecureStore value has been read/created on startup.
  deviceId: string | null;
  setDeviceId: (deviceId: string) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  deviceId: null,
  setDeviceId: (deviceId) => set({ deviceId }),
}));

/**
 * Returns the persistent device UUID, generating and storing one in the secure
 * store on first launch. This is the anonymous identity used for reminders and
 * push notifications — it is never tied to an account.
 */
export const getOrCreateDeviceId = async (): Promise<string> => {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
};
