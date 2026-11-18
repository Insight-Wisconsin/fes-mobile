import { DEFAULT_INTENSITY, getDatabase, storage } from './index';
import * as repo from './repository';
import type { AngleSample, Impulse, SensorSource, Session, SqlDatabase } from './types';

// Samples arrive ~50 times a second; writing them once a second keeps the
// database busy for a few milliseconds instead of on every reading.
const FLUSH_INTERVAL_MS = 1000;

/**
 * Records one session: creates its row, buffers the angle stream and impulses
 * in memory, writes them in batches, and closes the session out on `finish()`.
 *
 * If the app dies mid-session, at most the last second of data is lost, and
 * the session is marked 'interrupted' the next time the app starts.
 */
export class SessionRecorder {
  private samples: AngleSample[] = [];
  private impulses: Impulse[] = [];
  private impulseCount = 0;
  private writes: Promise<void> = Promise.resolve();
  private finished: Promise<Session | null> | null = null;
  private readonly timer: ReturnType<typeof setInterval>;

  private constructor(
    private readonly db: SqlDatabase,
    readonly session: Session
  ) {
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  /**
   * Starts recording. The session's intensity is the last one saved from the
   * home screen dial. Returns null when storage is unavailable; the session
   * itself can still run, it just isn't saved.
   */
  static async start(input: {
    userId: string | null;
    calibrationId: string | null;
    calibrationAngle: number | null;
    sensorSource: SensorSource;
  }): Promise<SessionRecorder | null> {
    const db = await getDatabase();
    if (db === null) return null;

    try {
      const intensity = (await storage.getIntensity()) ?? DEFAULT_INTENSITY;
      const session = await repo.startSession(db, { ...input, intensity });
      return new SessionRecorder(db, session);
    } catch (err) {
      console.warn('[DB] Could not start recording the session:', err);
      return null;
    }
  }

  addAngleSample(sample: AngleSample): void {
    if (this.finished) return;
    this.samples.push(sample);
  }

  addImpulse(impulse: Impulse): void {
    if (this.finished) return;
    this.impulses.push(impulse);
    this.impulseCount += 1;
  }

  /** Writes everything buffered so far. Writes run one at a time, in order. */
  private flush(): Promise<void> {
    if (this.samples.length === 0 && this.impulses.length === 0) return this.writes;

    const batch = { samples: this.samples, impulses: this.impulses };
    this.samples = [];
    this.impulses = [];

    this.writes = this.writes
      .then(() => repo.appendSessionData(this.db, this.session.id, batch))
      .catch((err) => console.warn('[DB] Could not save a batch of session data:', err));
    return this.writes;
  }

  /** Saves what's left and marks the session completed. Safe to call twice. */
  finish(endedAt: number = Date.now()): Promise<Session | null> {
    if (this.finished === null) {
      clearInterval(this.timer);
      const impulseCount = this.impulseCount;
      this.finished = this.flush()
        .then(() => repo.finishSession(this.db, this.session.id, { endedAt, impulseCount }))
        .catch((err) => {
          console.warn('[DB] Could not finish the session:', err);
          return null;
        });
    }
    return this.finished;
  }
}
