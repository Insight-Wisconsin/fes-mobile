// Tests the app's database code (services/database: schema, repository and
// stats) against Node's built-in SQLite, without a phone.
//
//   npm run test:db
//
// Needs Node 22.18+ (or 23.6+), which can run TypeScript files directly.
import { register } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const [major, minor] = process.versions.node.split('.').map(Number);
if (!(major > 23 || (major === 23 && minor >= 6) || (major === 22 && minor >= 18))) {
  console.error(`npm run test:db needs Node 22.18+ or 23.6+ (you have ${process.versions.node}).`);
  process.exit(1);
}

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        try { return await next(spec, ctx); }
        catch (e) { if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx); throw e; }
      }`)
);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const repo = await load('services/database/repository.ts');
const stats = await load('services/database/stats.ts');
const { LATEST_SCHEMA_VERSION } = await load('services/database/schema.ts');

function open() {
  const raw = new DatabaseSync(':memory:');
  return {
    raw,
    async execAsync(sql) { raw.exec(sql); },
    async runAsync(sql, p) { const r = raw.prepare(sql).run(...p); return { changes: Number(r.changes) }; },
    async getFirstAsync(sql, p) { return raw.prepare(sql).get(...p) ?? null; },
    async getAllAsync(sql, p) { return raw.prepare(sql).all(...p); },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try { await task(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
}

let passed = 0;
async function test(name, fn) {
  const db = open();
  db.raw.exec('PRAGMA foreign_keys = ON');
  await repo.migrate(db);
  try { await fn(db); passed++; console.log('ok  ', name); }
  catch (e) { console.log('FAIL', name); console.log(e); process.exitCode = 1; }
}
const count = (db, sql, ...p) => Number(Object.values(db.raw.prepare(sql).get(...p))[0]);

await test('migrations run once and set the version', async (db) => {
  assert.equal(count(db, 'PRAGMA user_version'), LATEST_SCHEMA_VERSION);
  await repo.migrate(db); // second run is a no-op, not a "table exists" error
  const tables = db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((r) => r.name);
  assert.deepEqual(tables, ['calibration_samples', 'calibrations', 'session_angle_samples', 'session_impulses', 'sessions', 'settings']);
});

await test('settings insert and overwrite', async (db) => {
  assert.equal(await repo.getSetting(db, 'intensity'), null);
  await repo.setSetting(db, 'intensity', '4');
  await repo.setSetting(db, 'intensity', '7');
  assert.equal(await repo.getSetting(db, 'intensity'), '7');
  assert.equal(count(db, 'SELECT count(*) FROM settings'), 1);
});

await test('calibration saves samples and averages only valid ones', async (db) => {
  const samples = [10, 12, 14, 16, 99].map((angle, i) => ({ angle, timestamp: 1000 + i, isValid: i < 4 }));
  const cal = await repo.saveCalibration(db, { userId: null, sensorSource: 'phone_gyroscope', samples, createdAt: 5000 });
  assert.equal(cal.averageAngle, 13);
  assert.equal(cal.validSampleCount, 4);
  assert.equal(cal.sampleCount, 5);
  assert.match(cal.id, /^[0-9a-f]{32}$/);
  const back = await repo.getCalibrationSamples(db, cal.id);
  assert.deepEqual(back.map((s) => s.angle), [10, 12, 14, 16, 99]);
  assert.equal(back[4].isValid, false);
});

await test('calibration with no valid samples saves nothing', async (db) => {
  const cal = await repo.saveCalibration(db, { userId: null, sensorSource: 'phone_gyroscope', samples: [{ angle: 3, timestamp: 1, isValid: false }] });
  assert.equal(cal, null);
  assert.equal(count(db, 'SELECT count(*) FROM calibrations'), 0);
});

await test('latest calibration is per user, and null user is its own bucket', async (db) => {
  const s = [{ angle: 20, timestamp: 1, isValid: true }];
  await repo.saveCalibration(db, { userId: null, sensorSource: 'phone_gyroscope', samples: s, createdAt: 100 });
  const newer = await repo.saveCalibration(db, { userId: null, sensorSource: 'phone_gyroscope', samples: [{ angle: 30, timestamp: 2, isValid: true }], createdAt: 200 });
  await repo.saveCalibration(db, { userId: 'u1', sensorSource: 'phone_gyroscope', samples: [{ angle: 40, timestamp: 3, isValid: true }], createdAt: 300 });
  assert.equal((await repo.getLatestCalibration(db, null)).id, newer.id);
  assert.equal((await repo.getLatestCalibration(db, 'u1')).averageAngle, 40);
  assert.equal(await repo.getLatestCalibration(db, 'nobody'), null);
});

await test('session lifecycle: start, stream 450 samples + impulses, finish', async (db) => {
  const cal = await repo.saveCalibration(db, { userId: null, sensorSource: 'phone_gyroscope', samples: [{ angle: 15, timestamp: 1, isValid: true }] });
  const s = await repo.startSession(db, { userId: null, calibrationId: cal.id, calibrationAngle: 15, sensorSource: 'phone_gyroscope', intensity: 7.6, startedAt: 10_000 });
  assert.equal(s.status, 'active');
  assert.equal(s.intensity, 8); // rounded and clamped
  const samples = Array.from({ length: 450 }, (_, i) => ({ recordedAt: 10_000 + i * 20, angle: i / 10, rawAngle: i / 10 + 0.5 }));
  await repo.appendSessionData(db, s.id, { samples: samples.slice(0, 300), impulses: [{ occurredAt: 12_000, angle: 15 }] });
  await repo.appendSessionData(db, s.id, { samples: samples.slice(300), impulses: [{ occurredAt: 18_000, angle: 15.5 }] });
  const done = await repo.finishSession(db, s.id, { endedAt: 70_000, impulseCount: 2 });
  assert.equal(done.status, 'completed');
  assert.equal(done.durationMs, 60_000);
  assert.equal(done.impulseCount, 2);
  assert.equal((await repo.getSessionAngleSamples(db, s.id)).length, 450);
  assert.deepEqual((await repo.getSessionImpulses(db, s.id)).map((i) => i.angle), [15, 15.5]);
  assert.equal(await repo.finishSession(db, s.id, { impulseCount: 9 }), null, 'finishing twice is a no-op');
});

await test('end time before start is clamped to zero duration', async (db) => {
  const s = await repo.startSession(db, { userId: null, calibrationId: null, calibrationAngle: null, sensorSource: 'phone_gyroscope', intensity: 5, startedAt: 5000 });
  const done = await repo.finishSession(db, s.id, { endedAt: 4000, impulseCount: 0 });
  assert.equal(done.durationMs, 0);
});

await test('sessions left active are closed as interrupted at their last data point', async (db) => {
  const a = await repo.startSession(db, { userId: null, calibrationId: null, calibrationAngle: 12, sensorSource: 'phone_gyroscope', intensity: 5, startedAt: 1000 });
  await repo.appendSessionData(db, a.id, { samples: [{ recordedAt: 4000, angle: 1, rawAngle: null }], impulses: [{ occurredAt: 6000, angle: 12 }, { occurredAt: 3000, angle: 12 }] });
  const b = await repo.startSession(db, { userId: null, calibrationId: null, calibrationAngle: 12, sensorSource: 'phone_gyroscope', intensity: 5, startedAt: 9000 });
  const c = await repo.startSession(db, { userId: null, calibrationId: null, calibrationAngle: 12, sensorSource: 'phone_gyroscope', intensity: 5, startedAt: 20000 });
  await repo.finishSession(db, c.id, { endedAt: 25000, impulseCount: 0 });

  assert.equal(await repo.recoverInterruptedSessions(db), 2);
  const rows = await repo.getSessionsStartedSince(db, null, 0);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.deepEqual([byId[a.id].status, byId[a.id].endedAt, byId[a.id].durationMs, byId[a.id].impulseCount], ['interrupted', 6000, 5000, 2]);
  assert.deepEqual([byId[b.id].status, byId[b.id].endedAt, byId[b.id].durationMs], ['interrupted', 9000, 0]);
  assert.equal(byId[c.id].status, 'completed', 'finished sessions are untouched');
});

await test('deleting a calibration cascades its samples and detaches sessions', async (db) => {
  const cal = await repo.saveCalibration(db, { userId: null, sensorSource: 'phone_gyroscope', samples: [{ angle: 15, timestamp: 1, isValid: true }] });
  const s = await repo.startSession(db, { userId: null, calibrationId: cal.id, calibrationAngle: 15, sensorSource: 'phone_gyroscope', intensity: 5 });
  db.raw.prepare('DELETE FROM calibrations WHERE id = ?').run(cal.id);
  assert.equal(count(db, 'SELECT count(*) FROM calibration_samples'), 0);
  const [row] = await repo.getSessionsStartedSince(db, null, 0);
  assert.equal(row.id, s.id);
  assert.equal(row.calibrationId, null);
  assert.equal(row.calibrationAngle, 15, 'the angle used is kept');
});

await test('constraints reject bad rows', async (db) => {
  assert.throws(() => db.raw.prepare("INSERT INTO sessions (sensor_source, intensity, started_at) VALUES ('x', 11, 0)").run());
  assert.throws(() => db.raw.prepare("INSERT INTO session_impulses (session_id, occurred_at, angle) VALUES ('missing', 0, 0)").run());
});

await test('sessions since: filters by user and time', async (db) => {
  const mk = (userId, startedAt) => repo.startSession(db, { userId, calibrationId: null, calibrationAngle: null, sensorSource: 'phone_gyroscope', intensity: 5, startedAt });
  await mk(null, 100); await mk(null, 500); await mk('u1', 600);
  assert.deepEqual((await repo.getSessionsStartedSince(db, null, 200)).map((s) => s.startedAt), [500]);
  assert.deepEqual((await repo.getSessionsStartedSince(db, 'u1', 0)).map((s) => s.startedAt), [600]);
});

// ---- stats (pure, no db)
{
  const now = new Date(2026, 10, 17, 15, 0); // Tue 17 Nov 2026, 3 pm local
  const t = (y, m, d, h = 12) => new Date(y, m, d, h).getTime();
  const day = stats.bucketSessionStarts('day', [t(2026, 10, 17, 0), t(2026, 10, 17, 23), t(2026, 10, 11), t(2026, 10, 10), t(2026, 10, 18)], now);
  assert.deepEqual(day.map((b) => b.label), ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']);
  assert.deepEqual(day.map((b) => b.value), [1, 0, 0, 0, 0, 0, 2]); // 10 Nov and 18 Nov fall outside
  const month = stats.bucketSessionStarts('month', [t(2026, 9, 21), t(2026, 9, 20), t(2026, 10, 17)], now);
  assert.deepEqual(month.map((b) => b.value), [1, 0, 0, 1]);
  const year = stats.bucketSessionStarts('year', [t(2025, 11, 1), t(2025, 10, 30), t(2026, 10, 1)], now);
  assert.equal(year[0].label, 'D');
  assert.deepEqual([year[0].value, year[11].value, year.reduce((a, b) => a + b.value, 0)], [1, 1, 2]);
  assert.equal(stats.statsRangeStart('day', now), t(2026, 10, 11, 0));
  passed++; console.log('ok   stats buckets');
}

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
