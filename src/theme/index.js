import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Define legacy V2 font configuration manually to avoid import issues
const fontConfig = {
  regular: {
    fontFamily: 'System',
    fontWeight: '400',
    letterSpacing: 0,
  },
  medium: {
    fontFamily: 'System',
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  light: {
    fontFamily: 'System',
    fontWeight: '300',
    letterSpacing: 0,
  },
  thin: {
    fontFamily: 'System',
    fontWeight: '100',
    letterSpacing: 0,
  },
};

export const lightTheme = {
  ...MD3LightTheme,
  fonts: {
    ...MD3LightTheme.fonts,
    ...fontConfig,
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563eb', // Blue 600
    onPrimary: '#ffffff',
    primaryContainer: '#dbeafe', // Blue 100
    onPrimaryContainer: '#1e3a8a', // Blue 900
    secondary: '#475569', // Slate 600
    onSecondary: '#ffffff',
    secondaryContainer: '#f1f5f9', // Slate 100
    onSecondaryContainer: '#0f172a', // Slate 900
    tertiary: '#0f172a', // Slate 900
    background: '#f8fafc', // Slate 50
    surface: '#ffffff',
    surfaceVariant: '#f1f5f9', // Slate 100
    onSurface: '#0f172a', // Slate 900
    onSurfaceVariant: '#475569', // Slate 600
    outline: '#cbd5e1', // Slate 300
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#f8fafc',
      level3: '#f1f5f9',
      level4: '#e2e8f0',
      level5: '#cbd5e1',
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  fonts: {
    ...MD3DarkTheme.fonts,
    ...fontConfig,
  },
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#60a5fa', // Blue 400
    onPrimary: '#0f172a', // Slate 900
    primaryContainer: '#1e3a8a', // Blue 900
    onPrimaryContainer: '#dbeafe', // Blue 100
    secondary: '#94a3b8', // Slate 400
    onSecondary: '#0f172a',
    secondaryContainer: '#334155', // Slate 700
    onSecondaryContainer: '#f1f5f9', // Slate 100
    tertiary: '#f8fafc', // Slate 50
    background: '#0f172a', // Slate 900
    surface: '#1e293b', // Slate 800
    surfaceVariant: '#334155', // Slate 700
    onSurface: '#f8fafc', // Slate 50
    onSurfaceVariant: '#cbd5e1', // Slate 300
    outline: '#475569', // Slate 600
    elevation: {
      level0: 'transparent',
      level1: '#1e293b', // Slate 800
      level2: '#334155', // Slate 700
      level3: '#475569', // Slate 600
      level4: '#64748b', // Slate 500
      level5: '#94a3b8', // Slate 400
    },
  },
};
