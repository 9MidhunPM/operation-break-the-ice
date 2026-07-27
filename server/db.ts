import Database from 'better-sqlite3'
import type { Database as DB } from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, 'data.sqlite')

/**
 * Single SQLite database for slot reservations. Persisted to disk so a server
 * restart during the event never wipes 500 students' assignments.
 */
const db: DB = (() => {
  const instance = new Database(DB_PATH)
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  instance.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      token        TEXT PRIMARY KEY,
      slot_id      TEXT NOT NULL UNIQUE,
      team_id      TEXT NOT NULL,
      name         TEXT,
      claimed_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reservations_team ON reservations(team_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(slot_id);
  `)
  return instance
})()

export interface ReservationRow {
  token: string
  slot_id: string
  team_id: string
  name: string | null
  claimed_at: string
}

export const stmt = {
  getByToken: db.prepare<
    [string],
    ReservationRow
  >('SELECT token, slot_id, team_id, name, claimed_at FROM reservations WHERE token = ?'),
  getBySlot: db.prepare<
    [string],
    ReservationRow
  >('SELECT token, slot_id, team_id, name, claimed_at FROM reservations WHERE slot_id = ?'),
  insert: db.prepare(
    'INSERT INTO reservations (token, slot_id, team_id, name, claimed_at) VALUES (?, ?, ?, ?, ?)',
  ),
  setName: db.prepare('UPDATE reservations SET name = ? WHERE token = ?'),
  deleteByToken: db.prepare('DELETE FROM reservations WHERE token = ?'),
  countAll: db.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM reservations'),
  countByTeam: db.prepare<
    [string],
    { c: number }
  >('SELECT COUNT(*) AS c FROM reservations WHERE team_id = ?'),
  teamCounts: db.prepare<
    [],
    { team_id: string; c: number }
  >('SELECT team_id, COUNT(*) AS c FROM reservations GROUP BY team_id'),
}

export const transaction = db.transaction.bind(db)
export { db }
