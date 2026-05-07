import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StoredPushRegistration } from "./types";

const PUSH_REGISTRATION_KEY = "fayed.mobile.push.registration.v1";

export async function getStoredPushRegistration() {
  const raw = await AsyncStorage.getItem(PUSH_REGISTRATION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredPushRegistration;
  } catch {
    await AsyncStorage.removeItem(PUSH_REGISTRATION_KEY);
    return null;
  }
}

export async function storePushRegistration(
  registration: StoredPushRegistration,
) {
  await AsyncStorage.setItem(
    PUSH_REGISTRATION_KEY,
    JSON.stringify(registration),
  );
}

export async function clearStoredPushRegistration() {
  await AsyncStorage.removeItem(PUSH_REGISTRATION_KEY);
}
