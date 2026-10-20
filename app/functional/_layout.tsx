import { Stack } from 'expo-router';

/**
 * Screens in this group render their own headers, so the native one stays
 * hidden throughout. Titles are kept for accessibility and the dev sitemap.
 */
export default function FunctionalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" options={{ title: 'Home' }} />
      <Stack.Screen name="calibration" options={{ title: 'Calibration' }} />
      <Stack.Screen name="session" options={{ title: 'Session' }} />
      <Stack.Screen name="real-time-data" options={{ title: 'Real-Time Data' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
