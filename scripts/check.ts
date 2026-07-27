// Sanity checks: static game logic + live backend reservation behaviour.
// Run with: npx tsx scripts/check.ts   (requires `npm run dev` running)
import {
  TEAMS,
  SLOT_MAP,
  CODE_INDEX,
  DATASET_VALIDATION,
  EXPECTED_TEAM_COUNT,
  CHARACTERS_PER_TEAM,
} from '../src/data/teams'
import {
  checkTeammateCode,
  normalizeCode,
  findSlotByCode,
  totalSlotCount,
} from '../src/lib/game'

const API = process.env.API_BASE || 'http://localhost:5173'

let pass = 0
let fail = 0
const ok = (name: string, cond: boolean) => {
  if (cond) pass++
  else {
    fail++
    console.error('  FAIL:', name)
  }
}

// ---------------------------------------------------------------------------
// 1) Static dataset + logic integrity
// ---------------------------------------------------------------------------
ok('dataset validation passes', DATASET_VALIDATION.ok)
ok('exactly 25 teams', TEAMS.length === EXPECTED_TEAM_COUNT)
ok('20 chars per team', TEAMS.every((t) => t.characters.length === CHARACTERS_PER_TEAM))
ok('500 total slots', totalSlotCount() === 500)
ok('500 slot ids', Object.keys(SLOT_MAP).length === 500)
ok('500 pair codes', Object.keys(CODE_INDEX).length === 500)

const me = SLOT_MAP['T01-C01']!
const teammate = SLOT_MAP['T01-C02']!
const foreign = SLOT_MAP['T02-C01']!

ok('self -> self', checkTeammateCode(me, me.pairCode).status === 'self')
ok('same team -> match', checkTeammateCode(me, teammate.pairCode).status === 'match')
ok('other team -> wrong-team', checkTeammateCode(me, foreign.pairCode).status === 'wrong-team')
ok('garbage -> invalid', checkTeammateCode(me, 'ZZZZZ').status === 'invalid')
ok('wrong-team never leaks name', !('teamName' in checkTeammateCode(me, foreign.pairCode)))

const badChars = /[O01IL]/i
ok('no ambiguous chars in any code', !Object.keys(CODE_INDEX).some((c) => badChars.test(c)))
ok('normalizeCode trims+upper', normalizeCode('  ax7kd  ') === 'AX7KD')
ok('findSlotByCode works', findSlotByCode(me.pairCode)?.slotId === 'T01-C01')

// ---------------------------------------------------------------------------
// 2) Live backend (optional — only if dev server is up)
// ---------------------------------------------------------------------------
async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, init)
  return { status: res.status, body: await res.json().catch(() => ({})) }
}
const post = (path: string, body: unknown) =>
  json(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const patch = (path: string, body: unknown) =>
  json(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

let backend = true
try {
  const h = await fetch(`${API}/api/health`)
  if (!h.ok) throw new Error('health not ok')
} catch {
  backend = false
  console.log('\n(backend not running on ' + API + ' — skipping live checks)')
}

if (backend) {
  const t1 = 'check-token-1'
  const t2 = 'check-token-2'

  const c1 = await post('/api/claim', { token: t1 })
  ok('claim returns a slot', !!c1.body.slotId)
  ok('claim existing:false', c1.body.existing === false)

  const c1b = await post('/api/claim', { token: t1 })
  ok('claim is idempotent (same slot)', c1b.body.slotId === c1.body.slotId)
  ok('claim existing:true on repeat', c1b.body.existing === true)

  const c2 = await post('/api/claim', { token: t2 })
  ok('two tokens get DIFFERENT slots', c1.body.slotId !== c2.body.slotId)

  const me1 = await json('/api/me', { headers: { 'x-token': t1 } })
  ok('GET /api/me restores slot', me1.body.slotId === c1.body.slotId)

  const rename = await patch('/api/me/name', { token: t1, name: 'Tester One' })
  ok('PATCH name ok', rename.body.ok === true)
  const me1b = await json('/api/me', { headers: { 'x-token': t1 } })
  ok('name persisted', me1b.body.name === 'Tester One')

  const stats = await json('/api/stats')
  ok('stats has joined count', typeof stats.body.joined === 'number')
  ok('stats has per-team array', Array.isArray(stats.body.perTeam))

  const wrongPin = await post('/api/release', { token: t1, pin: 'wrong' })
  ok('release wrong PIN -> 403', wrongPin.status === 403)

  const pin = process.env.ORGANISER_PIN || '220806'
  const rightPin = await post('/api/release', { token: t1, pin })
  ok('release correct PIN -> ok', rightPin.body.ok === true)

  const me1c = await json('/api/me', { headers: { 'x-token': t1 } })
  ok('released slot -> 404', me1c.status === 404)

  // cleanup t2
  await post('/api/release', { token: t2, pin })
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
