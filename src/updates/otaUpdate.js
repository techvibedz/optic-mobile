// OTA updater using expo-updates in manual mode.
import * as Updates from 'expo-updates';

export async function checkOtaUpdate() {
  if (__DEV__) return { hasUpdate: false };
  try {
    const result = await Updates.checkForUpdateAsync();
    return { hasUpdate: !!result?.isAvailable };
  } catch (e) {
    console.log('[otaUpdate] check failed:', e?.message);
    return { hasUpdate: false, error: e?.message };
  }
}

export async function fetchAndReloadOta() {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}
