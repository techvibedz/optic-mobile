// APK self-updater: fetches version.json from GitHub raw, compares versions,
// downloads the APK from a GitHub Release and triggers the Android installer.
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Public GitHub raw URL — bump latestVersion + apkUrl in this file to trigger updates
export const VERSION_JSON_URL =
  'https://raw.githubusercontent.com/techvibedz/optic-mobile/main/version.json';

export function getCurrentAppVersion() {
  return Constants.expoConfig?.version || Constants.manifest?.version || '0.0.0';
}

// Compare two semver-ish strings ("1.2.3"). Returns 1 / 0 / -1.
export function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

// Fetch version.json. Shape:
// {
//   "latestVersion": "1.1.0",
//   "apkUrl": "https://github.com/techvibedz/optic-mobile/releases/download/v1.1.0/optic-frantz-fanon-1.1.0.apk",
//   "releaseNotes": "..."
// }
export async function fetchRemoteVersion() {
  const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`version.json HTTP ${res.status}`);
  return await res.json();
}

export async function checkApkUpdate() {
  if (Platform.OS !== 'android') return { hasUpdate: false };
  try {
    const remote = await fetchRemoteVersion();
    const current = getCurrentAppVersion();
    const hasUpdate =
      remote?.latestVersion &&
      remote?.apkUrl &&
      compareVersions(remote.latestVersion, current) > 0;
    return { hasUpdate, current, remote };
  } catch (e) {
    console.log('[apkUpdate] check failed:', e?.message);
    return { hasUpdate: false, error: e?.message };
  }
}

// Download APK with progress, then launch the Android package installer.
// onProgress receives a number 0..1.
export async function downloadAndInstallApk(apkUrl, onProgress) {
  const fileName = `update-${Date.now()}.apk`;
  const localUri = `${FileSystem.cacheDirectory}${fileName}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    apkUrl,
    localUri,
    {},
    (p) => {
      if (p.totalBytesExpectedToWrite > 0) {
        onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');

  // Convert file:// to content:// so the package installer can read it
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}
