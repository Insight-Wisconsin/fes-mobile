/**
 * Database schema, as an ordered list of migrations.
 *
 * Each migration runs once per phone, in order, and the database remembers the
 * last one it ran (SQLite's `user_version`). To change the schema, ADD a new
 * migration at the end. Never edit one that has already shipped: phones that
 * already ran it would never see the edit.
 *
 * Conventions:
 * - Times are milliseconds since the Unix epoch (what `Date.now()` returns).
 * - Calibrations and sessions get random text IDs, so rows made on different
 *   phones never collide if they are synced to a server later.
 * - `user_id` is the AuthContext user's id, or NULL when no one is signed in.
 * - `sensor_source` records where angle data came from ('phone_gyroscope'
 *   today, an external IMU later), so old and new data can be told apart.
 */

export interface Migration {
  version: number;
  description: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Settings, calibrations and sessions',
    sql: `
      CREATE TABLE settings (
        key        TEXT PRIMARY KEY NOT NULL,
        value      TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE calibrations (
        id                 TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
        user_id            TEXT,
        created_at         INTEGER NOT NULL,
        sensor_source      TEXT NOT NULL,
        average_angle      REAL NOT NULL,
        valid_sample_count INTEGER NOT NULL,
        sample_count       INTEGER NOT NULL
      );
      CREATE INDEX calibrations_by_user ON calibrations (user_id, created_at);

      -- One row per captured foot angle (5 per calibration today).
      CREATE TABLE calibration_samples (
        id             INTEGER PRIMARY KEY,
        calibration_id TEXT NOT NULL REFERENCES calibrations (id) ON DELETE CASCADE,
        sample_index   INTEGER NOT NULL,
        angle          REAL NOT NULL,
        captured_at    INTEGER NOT NULL,
        is_valid       INTEGER NOT NULL CHECK (is_valid IN (0, 1)),
        UNIQUE (calibration_id, sample_index)
      );

      CREATE TABLE sessions (
        id                TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
        user_id           TEXT,
        calibration_id    TEXT REFERENCES calibrations (id) ON DELETE SET NULL,
        sensor_source     TEXT NOT NULL,
        -- The trigger angle actually used, kept even if the calibration is deleted.
        calibration_angle REAL,
        intensity         INTEGER NOT NULL CHECK (intensity BETWEEN 0 AND 10),
        started_at        INTEGER NOT NULL,
        ended_at          INTEGER,
        duration_ms       INTEGER,
        impulse_count     INTEGER NOT NULL DEFAULT 0,
        -- 'interrupted' = the app closed or crashed before the session was stopped.
        status            TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'completed', 'interrupted'))
      );
      CREATE INDEX sessions_by_user ON sessions (user_id, started_at);

      CREATE TABLE session_impulses (
        id          INTEGER PRIMARY KEY,
        session_id  TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
        occurred_at INTEGER NOT NULL,
        angle       REAL NOT NULL
      );
      CREATE INDEX session_impulses_by_session ON session_impulses (session_id, occurred_at);

      -- The angle stream during a session (about 50 rows a second).
      CREATE TABLE session_angle_samples (
        id          INTEGER PRIMARY KEY,
        session_id  TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
        recorded_at INTEGER NOT NULL,
        angle       REAL NOT NULL,
        raw_angle   REAL
      );
      CREATE INDEX session_angle_samples_by_session ON session_angle_samples (session_id, recorded_at);
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
