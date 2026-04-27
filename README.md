# Optic Frantz Fanon — Mobile

Expo (React Native) mobile companion to the Optic optical management web app.

## Update System

Two layers, checked on every launch in this order:

1. **APK self-updater** — fetches `version.json` from this repo's raw URL.
   If `latestVersion` > installed version, the user sees an in-app modal,
   downloads the APK from a GitHub Release, and the OS package installer
   takes over.
2. **OTA via Expo Updates (manual mode)** — only runs if no APK update is
   pending. JS-only changes get pushed via `eas update` and applied with a
   single restart.

### Push a JS-only OTA

```powershell
$env:CI=1; eas update --channel preview --message "describe the change" --platform android
```

### Ship a new APK

1. Bump `version` and `runtimeVersion` in `app.json` (and `versionCode`).
2. `eas build --platform android --profile preview`
3. Upload the resulting APK to a GitHub release tag (e.g. `v1.2.0`).
4. Update `version.json` on `main` with the new `latestVersion` + `apkUrl`.
5. Commit + push — installed users will see the update prompt on next launch.
