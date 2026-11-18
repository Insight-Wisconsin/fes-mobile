/**
 * The app's on-phone database (SQLite via expo-sqlite).
 *
 * Screens use `storage` (and `SessionRecorder` for live sessions). Every call
 * is safe to make: when storage is unavailable (the browser, or an FES build
 * made before expo-sqlite was added) or a query fails, it logs a warning and
 * returns an empty result instead of throwing, so storage can never take the
 * app down mid-session.
 */
import { openDatabase } from './driver';
import * as repo from './repository';
import type { Calibration, CalibrationSampleInput, SensorSource, Session, SqlDatabase } from './types';

export * from './types';

const DATABASE_NAME = 'fes.db';
export const DEFAULT_INTENSITY = 5;

let databasePromise: Promise<SqlDatabase | null> | null = null;

async function initialise(): Promise<SqlDatabase | null> {
  try {
    const db = await openDatabase(DATABASE_NAME);
    if (db === null) {
      console.info('[DB] Storage is not available in this build; data will not be saved.');
      return null;
    }
    // WAL keeps writes fast while a session streams samples. Foreign keys are
    // off by default in SQLite and must be enabled on every connection.
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await repo.migrate(db);
    const recovered = await repo.recoverInterruptedSessions(db);
    if (recovered > 0) {
      console.info(`[DB] Closed ${recovered} session(s) left open when the app last stopped.`);
    }
    return db;
  } catch (err) {
    console.warn('[DB] Could not open the database; data will not be saved.', err);
    return null;
  }
}

/** Opens and migrates the database on first use; later calls share it. */
export function getDatabase(): Promise<SqlDatabase | null> {
  databasePromise ??= initialise();
  return databasePromise;
}

async function withDatabase<T>(
  action: string,
  fallback: T,
  task: (db: SqlDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  if (db === null) return fallback;
  try {
    return await task(db);
  } catch (err) {
    console.warn(`[DB] Could not ${action}:`, err);
    return fallback;
  }
}

const INTENSITY_KEY = 'intensity';

export const storage = {
  /** False in the browser and in FES builds without the SQLite module. */
  isAvailable: async (): Promise<boolean> => (await getDatabase()) !== null,

  /** The last intensity the user chose, or null if none was saved. */
  getIntensity: (): Promise<number | null> =>
    withDatabase<number | null>('load the intensity', null, async (db) => {
      const value = await repo.getSetting(db, INTENSITY_KEY);
      const level = value === null ? NaN : Number(value);
      return Number.isFinite(level) ? repo.clampIntensity(level) : null;
    }),

  setIntensity: (level: number): Promise<void> =>
    withDatabase('save the intensity', undefined, (db) =>
      repo.setSetting(db, INTENSITY_KEY, String(repo.clampIntensity(level)))
    ),

  saveCalibration: (input: {
    userId: string | null;
    sensorSource: SensorSource;
    samples: CalibrationSampleInput[];
  }): Promise<Calibration | null> =>
    withDatabase<Calibration | null>('save the calibration', null, (db) =>
      repo.saveCalibration(db, input)
    ),

  getLatestCalibration: (userId: string | null): Promise<Calibration | null> =>
    withDatabase<Calibration | null>('load the calibration', null, (db) =>
      repo.getLatestCalibration(db, userId)
    ),

  getSessionsStartedSince: (userId: string | null, since: number): Promise<Session[]> =>
    withDatabase<Session[]>('load sessions', [], (db) =>
      repo.getSessionsStartedSince(db, userId, since)
    ),
};
