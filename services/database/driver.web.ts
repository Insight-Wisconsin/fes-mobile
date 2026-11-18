import type { SqlDatabase } from './types';

/**
 * No storage in the browser preview. expo-sqlite's web build needs extra
 * server headers and a WebAssembly setup that isn't worth it for a phone app,
 * and this file keeps it out of the web bundle entirely.
 */
export async function openDatabase(_name: string): Promise<SqlDatabase | null> {
  return null;
}
