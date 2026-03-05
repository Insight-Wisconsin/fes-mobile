import { Redirect } from 'expo-router';

// Auth bypass — go straight to home for BLE development/testing
export default function Index() {
  return <Redirect href="/functional/home" />;
}
