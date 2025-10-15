import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AngleProvider } from '@/contexts/AngleContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <AngleProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="functional" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', animation: 'none' }} />
            <Stack.Screen name="RealTimeData" options={{ headerShown: false, title: 'Real-Time Data', animation: 'none' }} />
            <Stack.Screen name="TodoList" options={{ headerShown: false, title: 'Todo List', animation: 'none' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AngleProvider>
    </AuthProvider>
  );
}
