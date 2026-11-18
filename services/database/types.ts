/**
 * The slice of a SQLite connection the data layer uses. expo-sqlite's
 * SQLiteDatabase satisfies it on the phone; tests can back it with any other
 * SQLite driver.
 */
export type SqlValue = string | number | null;

export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<{ changes: number }>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** Where angle data came from. The external IMU will add a new value. */
export type SensorSource = 'phone_gyroscope';

export type SessionStatus = 'active' | 'completed' | 'interrupted';

export interface CalibrationSampleInput {
  angle: number;
  /** When the angle was captured, in ms since the epoch. */
  timestamp: number;
  isValid: boolean;
}

export interface Calibration {
  id: string;
  userId: string | null;
  createdAt: number;
  sensorSource: SensorSource;
  /** Average of the valid samples, in degrees. */
  averageAngle: number;
  validSampleCount: number;
  sampleCount: number;
}

export interface Session {
  id: string;
  userId: string | null;
  calibrationId: string | null;
  sensorSource: SensorSource;
  calibrationAngle: number | null;
  intensity: number;
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  impulseCount: number;
  status: SessionStatus;
}

export interface AngleSample {
  recordedAt: number;
  angle: number;
  rawAngle: number | null;
}

export interface Impulse {
  occurredAt: number;
  angle: number;
}
