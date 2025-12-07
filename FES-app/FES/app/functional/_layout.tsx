import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="home" 
        options={{ 
          headerShown: false,
          title: 'Home'
        }} 
      />
      <Stack.Screen 
        name="calibration" 
        options={{ 
          headerShown: false,
          title: 'Calibration'
        }} 
      />
      <Stack.Screen 
        name="session" 
        options={{ 
          headerShown: false,
          title: 'Session'
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          headerShown: false,
          title: 'Settings'
        }} 
      />
    </Stack>
  );
}
