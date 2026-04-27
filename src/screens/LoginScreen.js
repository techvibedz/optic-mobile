import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme, Surface, HelperText, IconButton, Portal, Modal, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, updateApiUrl, testApiConnection } from '../api/config';
import Logo from '../components/Logo';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, logout, isLoading } = useAuth();
  const theme = useTheme();
  
  const [showPassword, setShowPassword] = useState(false);
  
  // Server Config State
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadServerUrl();
  }, []);

  const loadServerUrl = async () => {
    const url = await getApiUrl();
    setServerUrl(url);
  };

  const handleSaveConfig = async () => {
    if (!serverUrl) {
        Alert.alert('Error', 'Server URL cannot be empty');
        return;
    }
    
    setSavingConfig(true);
    
    // Normalize for testing
    let urlToTest = serverUrl.trim();
    if (!/^https?:\/\//i.test(urlToTest)) {
         if (/^(\d{1,3}\.){3}\d{1,3}/.test(urlToTest) || urlToTest.startsWith('localhost')) {
             urlToTest = 'http://' + urlToTest;
         } else {
             urlToTest = 'https://' + urlToTest;
         }
    }
    if (urlToTest.endsWith('/')) {
        urlToTest = urlToTest.slice(0, -1);
    }

    // Auto-append /api if missing (common mistake)
    if (!urlToTest.endsWith('/api')) {
        urlToTest += '/api';
    }

    const result = await testApiConnection(urlToTest);
    
    if (!result.success) {
        Alert.alert(
            'Connection Failed',
            `Could not connect to server: ${result.error}. \n\nSave anyway?`,
            [
                { text: 'Cancel', style: 'cancel', onPress: () => setSavingConfig(false) },
                { 
                    text: 'Save Anyway', 
                    onPress: async () => {
                        await updateApiUrl(urlToTest);
                        // Clear any existing session when switching servers
                        await logout();
                        setSavingConfig(false);
                        setShowConfig(false);
                        Alert.alert('Saved', 'Server URL updated, but connection failed.');
                    }
                }
            ]
        );
        return;
    }

    await updateApiUrl(urlToTest);
    // Clear any existing session when switching servers
    await logout();
    setSavingConfig(false);
    setShowConfig(false);
    Alert.alert('Success', 'Connected to server successfully.');
  };

  const handleLogin = () => {
    login(email, password);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <View style={styles.topBar}>
                <IconButton 
                    icon="cog" 
                    iconColor={theme.colors.secondary} 
                    onPress={() => setShowConfig(true)}
                />
            </View>

            <View style={styles.header}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Logo width={220} height={220} />
              </View>
              <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.secondary }}>
                Sign in to your account
              </Text>
            </View>

            <Surface style={[styles.formCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                left={<TextInput.Icon icon="email" />}
              />
              
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                left={<TextInput.Icon icon="lock" />}
                right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
              />

              <Button 
                mode="contained" 
                onPress={handleLogin} 
                loading={isLoading} 
                disabled={isLoading || !email || !password}
                style={styles.button}
                contentStyle={{ height: 48 }}
              >
                Sign In
              </Button>
            </Surface>
            
            <View style={styles.footer}>
                <Text variant="bodySmall" style={{ textAlign: 'center', color: theme.colors.outline }}>
                    © 2026 Optimal Manager. All rights reserved.
                </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Portal>
        <Modal visible={showConfig} onDismiss={() => setShowConfig(false)} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headlineSmall" style={{marginBottom: 10, color: theme.colors.onSurface}}>Server Settings</Text>
            <Text variant="bodyMedium" style={{marginBottom: 20, color: theme.colors.secondary}}>
                Enter the full URL of your deployed backend API (e.g., https://optimal-manager.vercel.app/api).
                {'\n\n'}
                DO NOT enter your Supabase database URL here. The app connects to your API, which then connects to Supabase.
                {'\n\n'}
                Note: For local testing on Android, use your PC's IP (e.g., http://192.168.1.5:3000/api).
            </Text>
            
            <TextInput
                label="Server URL"
                value={serverUrl}
                onChangeText={setServerUrl}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="url"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
            />
            
            <View style={styles.modalActions}>
                <Button onPress={() => setShowConfig(false)} style={{marginRight: 10}}>Cancel</Button>
                <Button mode="contained" onPress={handleSaveConfig} loading={savingConfig}>Save</Button>
            </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  topBar: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  header: {
    marginBottom: 40,
  },
  formCard: {
    padding: 24,
    borderRadius: 24, // Ultimate rounded
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  },
  footer: {
    marginTop: 40,
  },
  modalContainer: {
    padding: 20,
    margin: 20,
    borderRadius: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  }
});

export default LoginScreen;
