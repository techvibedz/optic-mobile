import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useThemeContext } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import LensSummaryScreen from './src/screens/LensSummaryScreen';
import { initApi } from './src/api/config';
import UpdateGate from './src/updates/UpdateGate';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

const MainStack = () => {
  const { logout } = useAuth();
  const theme = useTheme();

  return (
    <Stack.Navigator 
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          title: 'OptiManage',
          headerRight: () => (
            <Button onPress={logout} compact textColor={theme.colors.error}>Logout</Button>
          )
        }} 
        
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ title: 'Orders' }} 
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailsScreen} 
        options={{ title: 'Order Details' }} 
      />
      <Stack.Screen 
        name="LensSummary" 
        component={LensSummaryScreen} 
        options={{ title: 'Lens Summary' }} 
      />
    </Stack.Navigator>
  );
};

const AuthStack = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
    <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

const RootNavigator = () => {
  const { userToken, isLoading } = useAuth();
  const theme = useTheme();
  const [isApiReady, setIsApiReady] = React.useState(false);

  React.useEffect(() => {
    const init = async () => {
      await initApi();
      setIsApiReady(true);
    };
    init();
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (!isLoading && isApiReady) {
      await SplashScreen.hideAsync();
    }
  }, [isLoading, isApiReady]);

  if (isLoading || !isApiReady) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} onLayout={onLayoutRootView}>
      <NavigationContainer theme={{
        dark: theme.dark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.onSurface,
          border: theme.colors.outline,
          notification: theme.colors.error,
        },
        fonts: theme.fonts,
      }}>
        {userToken ? <MainStack /> : <AuthStack />}
      </NavigationContainer>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
          <UpdateGate />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
