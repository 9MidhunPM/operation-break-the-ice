import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const rawPath = process.env.DB_PATH || './data/event.sqlite'
if (rawPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(rawPath)), { recursive: true })

export const db = new Database(rawPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')

db.exec(`
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  client_token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  pair_code TEXT NOT NULL UNIQUE,
  is_senior INTEGER NOT NULL DEFAULT 0 CHECK(is_senior IN (0,1)),
  joined_at TEXT NOT NULL,
  UNIQUE(team_id, character_id)
);

CREATE TABLE IF NOT EXISTS senior_invites (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  team_id TEXT NOT NULL UNIQUE,
  character_id TEXT NOT NULL,
  display_name TEXT,
  clue TEXT,
  photo_file TEXT,
  participant_id TEXT UNIQUE REFERENCES participants(id),
  created_at TEXT NOT NULL,
  UNIQUE(team_id, character_id)
);

CREATE TABLE IF NOT EXISTS pair_requests (
  id TEXT PRIMARY KEY,
  from_participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  to_participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('PENDING','ACCEPTED','DECLINED','EXPIRED')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  CHECK(from_participant_id <> to_participant_id)
);
CREATE INDEX IF NOT EXISTS idx_pair_requests_target ON pair_requests(to_participant_id, status);

CREATE TABLE IF NOT EXISTS alliances (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alliance_members (
  alliance_id TEXT NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  PRIMARY KEY(alliance_id, participant_id)
);

CREATE TABLE IF NOT EXISTS votes (
  voter_id TEXT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(voter_id <> target_id)
);

CREATE TABLE IF NOT EXISTS event_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  phase TEXT NOT NULL,
  hunt_ends_at INTEGER,
  reveal_team_id TEXT,
  reveal_step TEXT NOT NULL DEFAULT 'VOTE',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
`)

db.prepare(`INSERT OR IGNORE INTO event_state
  (id, phase, hunt_ends_at, reveal_team_id, reveal_step, updated_at)
  VALUES (1, 'JOINING', NULL, NULL, 'VOTE', ?)`)
  .run(new Date().toISOString())

export function resetLiveEvent() {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM pair_requests').run()
    db.prepare('DELETE FROM alliance_members').run()
    db.prepare('DELETE FROM alliances').run()
    db.prepare('DELETE FROM votes').run()
    db.prepare('UPDATE senior_invites SET participant_id = NULL').run()
    db.prepare('DELETE FROM participants').run()
    db.prepare(`UPDATE event_state SET phase='JOINING', hunt_ends_at=NULL, reveal_team_id=NULL, reveal_step='VOTE', updated_at=? WHERE id=1`)
      .run(new Date().toISOString())
  })
  tx()
}
