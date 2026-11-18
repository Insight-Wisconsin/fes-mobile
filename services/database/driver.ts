import { requireOptionalNativeModule } from 'expo';
import type { SqlDatabase } from './types';

/**
 * Opens the on-phone SQLite database, or returns null when this build of the
 * app has no SQLite native module (an FES development build made before
 * expo-sqlite was added). Like Bluetooth, storage then switches itself off
 * instead of crashing the app: importing expo-sqlite in that build would throw.
 */
export async function openDatabase(name: string): Promise<SqlDatabase | null> {
  if (requireOptionalNativeModule('ExpoSQLite') == null) return null;

  // Required lazily so the module is only evaluated once we know it can load.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
  return SQLite.openDatabaseAsync(name);
}
