// Single component that:
//  1. Checks the APK self-updater first
//  2. If no APK update, checks the OTA (expo-updates) channel
//  3. Renders the appropriate modal
//
// Mount it once at the root of the app (inside SafeAreaProvider).

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { checkApkUpdate, downloadAndInstallApk } from './apkUpdate';
import { checkOtaUpdate, fetchAndReloadOta } from './otaUpdate';

const COLORS = {
  bg: '#0f172a',
  card: '#1e293b',
  text: '#f1f5f9',
  muted: '#94a3b8',
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  border: '#334155',
};

export default function UpdateGate() {
  // mode: null | 'apk' | 'ota'
  const [mode, setMode] = useState(null);
  const [apkInfo, setApkInfo] = useState(null); // { latestVersion, apkUrl, releaseNotes }
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [otaApplying, setOtaApplying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. APK first
      const apk = await checkApkUpdate();
      if (cancelled) return;
      if (apk.hasUpdate) {
        setApkInfo(apk.remote);
        setMode('apk');
        return;
      }

      // 2. OTA
      const ota = await checkOtaUpdate();
      if (cancelled) return;
      if (ota.hasUpdate) {
        setMode('ota');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleApkInstall = async () => {
    if (!apkInfo?.apkUrl) return;
    setError(null);
    setDownloading(true);
    setProgress(0);
    try {
      await downloadAndInstallApk(apkInfo.apkUrl, setProgress);
      // The OS installer takes over; keep modal up in case user cancels.
    } catch (e) {
      setError(e?.message || 'Download failed');
      setDownloading(false);
    }
  };

  const handleOtaApply = async () => {
    setError(null);
    setOtaApplying(true);
    try {
      await fetchAndReloadOta();
      // App reloads — UI never returns here.
    } catch (e) {
      setError(e?.message || 'OTA update failed');
      setOtaApplying(false);
    }
  };

  const handleClose = () => {
    if (downloading || otaApplying) return;
    setMode(null);
  };

  if (!mode) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!mode}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {mode === 'apk' && apkInfo ? (
            <ApkUpdateBody
              info={apkInfo}
              downloading={downloading}
              progress={progress}
              error={error}
              onInstall={handleApkInstall}
              onLater={handleClose}
            />
          ) : null}

          {mode === 'ota' ? (
            <OtaUpdateBody
              applying={otaApplying}
              error={error}
              onApply={handleOtaApply}
              onLater={handleClose}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function ApkUpdateBody({ info, downloading, progress, error, onInstall, onLater }) {
  return (
    <View>
      <Text style={styles.title}>New version available</Text>
      <Text style={styles.subtitle}>
        Version {info.latestVersion} is ready to install.
      </Text>

      {info.releaseNotes ? (
        <ScrollView style={styles.notes} contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.notesText}>{info.releaseNotes}</Text>
        </ScrollView>
      ) : null}

      {downloading ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Downloading… {Math.round(progress * 100)}%
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {!downloading ? (
          <TouchableOpacity style={styles.btnSecondary} onPress={onLater}>
            <Text style={styles.btnSecondaryText}>Later</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.btnPrimary, downloading && { opacity: 0.7 }]}
          disabled={downloading}
          onPress={onInstall}
        >
          {downloading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Download & install</Text>
          )}
        </TouchableOpacity>
      </View>

      {Platform.OS === 'android' ? (
        <Text style={styles.hint}>
          You may be asked to allow installation from this app.
        </Text>
      ) : null}
    </View>
  );
}

function OtaUpdateBody({ applying, error, onApply, onLater }) {
  return (
    <View>
      <Text style={styles.title}>Update available</Text>
      <Text style={styles.subtitle}>
        A new version is ready. The app will restart to apply it.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {!applying ? (
          <TouchableOpacity style={styles.btnSecondary} onPress={onLater}>
            <Text style={styles.btnSecondaryText}>Later</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.btnPrimary, applying && { opacity: 0.7 }]}
          disabled={applying}
          onPress={onApply}
        >
          {applying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Update now</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  notes: {
    maxHeight: 160,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  notesText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  progressWrap: { marginBottom: 16 },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSecondary: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: { color: COLORS.muted, fontWeight: '600' },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  hint: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 12,
    textAlign: 'center',
  },
});
