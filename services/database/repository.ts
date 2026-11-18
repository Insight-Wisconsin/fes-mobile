/**
 * All SQL lives here. Every function takes the connection as its first
 * argument and imports nothing from React Native or Expo, so it can be tested
 * against any SQLite driver. Screens use the wrappers in ./index instead.
 */
import { MIGRATIONS } from './schema';
import type {
  AngleSample,
  Calibration,
  CalibrationSampleInput,
  Impulse,
  SensorSource,
  Session,
  SessionStatus,
  SqlDatabase,
  SqlValue,
} from './types';

// SQLite allows 32,766 bound values per statement; stay far below it.
const MAX_ROWS_PER_INSERT = 200;

// ---------------------------------------------------------------- migrations

/** Brings the schema up to date. Safe to run on every app start. */
export async function migrate(db: SqlDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      // PRAGMA can't take a bound parameter; the version is a number we own.
      await db.execAsync(`PRAGMA user_version = ${Number(migration.version)}`);
    });
  }
}

/**
 * Closes out sessions that were still 'active' when the app last stopped
 * (crash, force-quit, phone died). They end at their last recorded data point.
 * Only call this at startup, before any new session can begin.
 */
export async function recoverInterruptedSessions(db: SqlDatabase): Promise<number> {
  const lastDataPoint = `
    max(
      started_at,
      coalesce((SELECT max(recorded_at) FROM session_angle_samples a WHERE a.session_id = sessions.id), 0),
      coalesce((SELECT max(occurred_at) FROM session_impulses i WHERE i.session_id = sessions.id), 0)
    )`;
  const result = await db.runAsync(
    `UPDATE sessions SET
       status = 'interrupted',
       ended_at = ${lastDataPoint},
       duration_ms = ${lastDataPoint} - started_at,
       impulse_count = (SELECT count(*) FROM session_impulses i WHERE i.session_id = sessions.id)
     WHERE status = 'active'`,
    []
  );
  return result.changes;
}

// ------------------------------------------------------------------ settings

export async function getSetting(db: SqlDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(db: SqlDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, Date.now()]
  );
}

// -------------------------------------------------------------- calibrations

interface CalibrationRow {
  id: string;
  user_id: string | null;
  created_at: number;
  sensor_source: SensorSource;
  average_angle: number;
  valid_sample_count: number;
  sample_count: number;
}

function toCalibration(row: CalibrationRow): Calibration {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    sensorSource: row.sensor_source,
    averageAngle: row.average_angle,
    validSampleCount: row.valid_sample_count,
    sampleCount: row.sample_count,
  };
}

/**
 * Saves a calibration and every captured angle. Returns null, and saves
 * nothing, when none of the samples are valid: there is no angle to use.
 */
export async function saveCalibration(
  db: SqlDatabase,
  input: {
    userId: string | null;
    sensorSource: SensorSource;
    samples: CalibrationSampleInput[];
    createdAt?: number;
  }
): Promise<Calibration | null> {
  const valid = input.samples.filter((s) => s.isValid);
  if (valid.length === 0) return null;

  const averageAngle = valid.reduce((sum, s) => sum + s.angle, 0) / valid.length;
  const createdAt = input.createdAt ?? Date.now();
  let saved: Calibration | null = null;

  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<CalibrationRow>(
      `INSERT INTO calibrations
         (user_id, created_at, sensor_source, average_angle, valid_sample_count, sample_count)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [input.userId, createdAt, input.sensorSource, averageAngle, valid.length, input.samples.length]
    );
    if (!row) throw new Error('Calibration insert returned no row');

    await insertRows(
      db,
      'calibration_samples',
      ['calibration_id', 'sample_index', 'angle', 'captured_at', 'is_valid'],
      input.samples.map((s, index) => [row.id, index, s.angle, s.timestamp, s.isValid ? 1 : 0])
    );
    saved = toCalibration(row);
  });

  return saved;
}

/** The user's most recent calibration (`userId` null = signed-out data). */
export async function getLatestCalibration(
  db: SqlDatabase,
  userId: string | null
): Promise<Calibration | null> {
  const row = await db.getFirstAsync<CalibrationRow>(
    `SELECT * FROM calibrations WHERE user_id IS ? ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    [userId]
  );
  return row ? toCalibration(row) : null;
}

export async function getCalibrationSamples(
  db: SqlDatabase,
  calibrationId: string
): Promise<CalibrationSampleInput[]> {
  const rows = await db.getAllAsync<{ angle: number; captured_at: number; is_valid: number }>(
    `SELECT angle, captured_at, is_valid FROM calibration_samples
     WHERE calibration_id = ? ORDER BY sample_index`,
    [calibrationId]
  );
  return rows.map((r) => ({ angle: r.angle, timestamp: r.captured_at, isValid: r.is_valid === 1 }));
}

// ------------------------------------------------------------------ sessions

interface SessionRow {
  id: string;
  user_id: string | null;
  calibration_id: string | null;
  sensor_source: SensorSource;
  calibration_angle: number | null;
  intensity: number;
  started_at: number;
  ended_at: number | null;
  duration_ms: number | null;
  impulse_count: number;
  status: SessionStatus;
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    calibrationId: row.calibration_id,
    sensorSource: row.sensor_source,
    calibrationAngle: row.calibration_angle,
    intensity: row.intensity,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    impulseCount: row.impulse_count,
    status: row.status,
  };
}

export async function startSession(
  db: SqlDatabase,
  input: {
    userId: string | null;
    calibrationId: string | null;
    calibrationAngle: number | null;
    sensorSource: SensorSource;
    intensity: number;
    startedAt?: number;
  }
): Promise<Session> {
  const row = await db.getFirstAsync<SessionRow>(
    `INSERT INTO sessions
       (user_id, calibration_id, sensor_source, calibration_angle, intensity, started_at)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      input.userId,
      input.calibrationId,
      input.sensorSource,
      input.calibrationAngle,
      clampIntensity(input.intensity),
      input.startedAt ?? Date.now(),
    ]
  );
  if (!row) throw new Error('Session insert returned no row');
  return toSession(row);
}

/** Appends a batch of angle samples and impulses to an open session. */
export async function appendSessionData(
  db: SqlDatabase,
  sessionId: string,
  data: { samples: AngleSample[]; impulses: Impulse[] }
): Promise<void> {
  if (data.samples.length === 0 && data.impulses.length === 0) return;

  await db.withTransactionAsync(async () => {
    await insertRows(
      db,
      'session_angle_samples',
      ['session_id', 'recorded_at', 'angle', 'raw_angle'],
      data.samples.map((s) => [sessionId, s.recordedAt, s.angle, s.rawAngle])
    );
    await insertRows(
      db,
      'session_impulses',
      ['session_id', 'occurred_at', 'angle'],
      data.impulses.map((i) => [sessionId, i.occurredAt, i.angle])
    );
  });
}

export async function finishSession(
  db: SqlDatabase,
  sessionId: string,
  input: { endedAt?: number; impulseCount: number }
): Promise<Session | null> {
  const endedAt = input.endedAt ?? Date.now();
  const row = await db.getFirstAsync<SessionRow>(
    `UPDATE sessions SET
       status = 'completed',
       ended_at = max(?, started_at),
       duration_ms = max(?, started_at) - started_at,
       impulse_count = ?
     WHERE id = ? AND status = 'active'
     RETURNING *`,
    [endedAt, endedAt, input.impulseCount, sessionId]
  );
  return row ? toSession(row) : null;
}

/** Sessions started at or after `since`, oldest first. */
export async function getSessionsStartedSince(
  db: SqlDatabase,
  userId: string | null,
  since: number
): Promise<Session[]> {
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions WHERE user_id IS ? AND started_at >= ? ORDER BY started_at`,
    [userId, since]
  );
  return rows.map(toSession);
}

export async function getSessionAngleSamples(
  db: SqlDatabase,
  sessionId: string
): Promise<AngleSample[]> {
  const rows = await db.getAllAsync<{ recorded_at: number; angle: number; raw_angle: number | null }>(
    `SELECT recorded_at, angle, raw_angle FROM session_angle_samples
     WHERE session_id = ? ORDER BY recorded_at, id`,
    [sessionId]
  );
  return rows.map((r) => ({ recordedAt: r.recorded_at, angle: r.angle, rawAngle: r.raw_angle }));
}

export async function getSessionImpulses(db: SqlDatabase, sessionId: string): Promise<Impulse[]> {
  const rows = await db.getAllAsync<{ occurred_at: number; angle: number }>(
    `SELECT occurred_at, angle FROM session_impulses WHERE session_id = ? ORDER BY occurred_at, id`,
    [sessionId]
  );
  return rows.map((r) => ({ occurredAt: r.occurred_at, angle: r.angle }));
}

// ------------------------------------------------------------------- helpers

export function clampIntensity(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(10, Math.round(level)));
}

/** Multi-row INSERT, chunked to stay under SQLite's bound-value limit. */
async function insertRows(
  db: SqlDatabase,
  table: string,
  columns: string[],
  rows: SqlValue[][]
): Promise<void> {
  const placeholders = `(${columns.map(() => '?').join(', ')})`;
  for (let start = 0; start < rows.length; start += MAX_ROWS_PER_INSERT) {
    const chunk = rows.slice(start, start + MAX_ROWS_PER_INSERT);
    await db.runAsync(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${chunk.map(() => placeholders).join(', ')}`,
      chunk.flat()
    );
  }
}
