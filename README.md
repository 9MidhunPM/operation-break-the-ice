# Operation: Break the Ice — IEEE Orientation Game

A cinematic, in-person orientation experience for ~450–500 junior students,
divided into **25 themed teams**. Every team secretly contains one **senior
imposter** playing alongside the juniors. Students pair up inside their teams;
later, the auditorium projector dramatically reveals the twist, shows
childhood photos of the 25 imposters, and calls the moment: **"IMPOSTERS…
REVEAL YOURSELVES."** — a physical reveal, not a digital one.

Built with **React + Vite + TypeScript** + a **single-process Node + SQLite**
backend that does exactly one thing the frontend can't: atomically reserve a
unique character slot so no two students get the same team/character.

---

## Three things this app does

1. **Participant game** (`/`) — join, get a unique team + character + pair code,
   walk around, swap codes, lock a pair.
2. **Projector stage** (`/screen`) — the cinematic orientation sequence:
   welcome → find your team → game active → disturbance → imposter warning →
   childhood photos → hunt → final countdown → **REVEAL YOURSELVES** → closing.
3. **Stage control** (`/admin`) — a rehearsal-friendly operator console that
   drives the projector. Also shows live stats (players joined, team fill,
   recently matched).

---

## Single-command development

```bash
npm install
npm run dev      # http://localhost:5173  — app + API on ONE port
```

The reservation API is mounted into Vite's dev server via a plugin
(`server/plugin.ts`), so `npm run dev` serves the React app **and** `/api/*` on
the same origin. No second process, no CORS.

## Production

```bash
npm run build    # type-check + build static assets into dist/
npm start        # one Node process serves dist/ + /api on PORT (default 8080)
```

Deploy that single process to any cloud host (or run it on a laptop on the
venue Wi-Fi). The SQLite file (`server/data.sqlite`) persists across restarts.

---

## How the participant game works

- A student opens the site and clicks **Join Game** → the server assigns them
  a unique slot (a team + a character + a 5-char pair code). Teams are kept
  balanced (~20 each) via least-fill selection.
- The assignment is **locked to their browser** (localStorage) — team and
  character can never be changed by the student. Only their **name** is
  editable.
- They walk around, find another member of their own team, swap pair codes,
  and enter the teammate's code to **lock a pair** (pairing is local to each
  device — no backend round-trip).
- **Reset** is gated behind an organiser PIN so students can't trivially
  re-roll their character.

## How the stage experience works

The projector (`/screen`) and the operator console (`/admin`) share a small
**stage-state machine** persisted in `localStorage` (key
`ieee-orientation-stage-v1`). They stay in sync via the browser `storage` event
— **same browser profile, same stage laptop**. No WebSockets, no networking.

10 stages, advanced manually by the operator:

```
welcome → find-team → game-in-progress → disturbance
       → imposter-warning → photo-reveal → hunt
       → countdown → final-reveal → closing
```

- **Welcome / Find Your Team / Game Active** — cinematic titles, ambient
  animated backgrounds, a discreet live-stats strip at the bottom.
- **Disturbance** — a short, accessibility-safe glitch ("Something isn't
  right.").
- **Imposter Warning** — 4 manually-advanced beats culminating in "THERE IS AN
  IMPOSTER IN EVERY TEAM."
- **Photo Reveal** — 25 childhood photos in a 5×5 grid, groups of 5, or one
  large. Missing photos show an honest "Photo Pending" placeholder.
- **Hunt** — "Find The Imposter" with an operator-started countdown (default
  5:00, configurable). At zero → "TIME'S UP", never auto-advances.
- **Final Countdown** — "Lock In Your Guess" → 5·4·3·2·1 → "Decision Locked."
  Stops; the operator advances to the reveal.
- **Final Reveal** — 3 beats: "The Moment of Truth" → "Imposters…" →
  "REVEAL YOURSELVES." (the physical reveal climax).
- **Closing** — "Mission Complete. Welcome to IEEE."

The `/screen` page has a **hidden operator tray** (corner dot, `O` key, or
`?controls=1`) so the stage laptop can advance scenes without leaving the
projector. Keyboard: `→`/`Space` next, `←` previous, `G` photo grid, `F`
fullscreen.

## Live stats

Both `/screen` (ambient scenes) and `/admin` (a dedicated panel) poll the
backend read-only endpoints every 2.5s and show:

- **Players joined** — live count + progress bar toward 500.
- **Pairs locked** — total matches across the event.
- **Team fill** — 25-team mini bars (admin) with real capacities from the
  backend.
- **Recently matched** — a scrolling ticker of the last pair-locks.

If the backend is unreachable, the stats strip degrades gracefully — last-known
numbers persist with a dimmed dot, and the show continues unaffected.

---

## Configuration

Copy `.env.example` to `.env` and set:

| Var             | Default  | Purpose                                            |
| --------------- | -------- | -------------------------------------------------- |
| `ORGANISER_PIN` | `220806` | PIN required to reset a participant (server-side)  |
| `PORT`          | `8080`   | Production server port (dev always uses Vite's)    |
| `DB_PATH`       | `server/data.sqlite` | SQLite file location                     |

The `ORGANISER_PIN` is **never** shipped to the client bundle.

---

## Routes

| Route     | Owner    | Purpose                                          |
| --------- | -------- | ------------------------------------------------ |
| `/`       | Agent 1  | Participant game (join → name → reveal → play)   |
| `/screen` | Agent 2  | Projector / stage experience                     |
| `/admin`  | Agent 2  | Stage operator console + live stats              |

Unknown paths redirect to `/`.

---

## Reservation API

All endpoints are same-origin `/api/*`.

| Method + path        | Body / header            | Returns                         |
| -------------------- | ------------------------ | ------------------------------- |
| `POST /api/claim`    | `{ token }`              | reserved slot (idempotent)      |
| `GET /api/me`        | header `x-token`         | this token's reservation        |
| `PATCH /api/me/name` | `{ token, name }`        | `{ ok }` (name only)            |
| `POST /api/release`  | `{ token, pin }`         | `{ ok }` (PIN-gated reset)      |
| `GET /api/stats`     | —                        | counts + per-team distribution  |
| `GET /api/health`    | —                        | `{ ok }`                        |

---

## Drop-in your real assets

- **Team/character content** — edit `src/data/teams.ts` (`RAW_TEAMS` and the
  character pool). The server imports the same file, so client and server can
  never disagree. Drop artwork into `/public/art/teams/<id>.png` and
  `/public/art/characters/<slot>.png`; missing art falls back to a generated
  placeholder.
- **Imposter childhood photos** — drop 25 square images into
  `public/imposters/team-01.jpg` … `team-25.jpg` (see
  [`public/imposters/README.txt`](public/imposters/README.txt)). Until added,
  the projector shows honest "Photo Pending" placeholders.

---

## Project structure

```
server/
  api.ts        Express app: claim / me / name / release / stats / health
  db.ts         better-sqlite3: reservations table + prepared statements
  slots.ts      least-fill team selection + atomic claimForToken()
  plugin.ts     Vite plugin mounting /api into the dev server
  index.ts      standalone prod server (serves dist/ + /api on one port)
src/
  pages/
    GamePage.tsx     participant flow (join → name → reveal → play → locked)
    ScreenPage.tsx   projector (full-viewport, keyboard + hidden controls)
    AdminPage.tsx    stage operator console + live stats
  components/
    game/            JoinScreen, NameEntry, Reveal, PlayerCard, dialogs
    stage/           10 scene components, StageShell, StatsRail, TeamFillGrid
    shared/          Button, Card, Screen, ArtImage, dialogs
  lib/
    api.ts           client fetch wrappers (same-origin /api)
    clientToken.ts   per-browser UUID in localStorage
    session.ts       localStorage player cache
    game.ts          pairing rules (checkTeammateCode, normalizeCode)
    stage.ts         stage state machine + sync hook + helpers
    useStageStats.ts live stats polling hook (offline-safe)
  data/
    teams.ts           25 teams × 20 chars = 500 slots (shared with server)
    imposterReveal.ts  25 team → childhood photo records (no personal data)
  types/
    api.ts            shared request/response shapes
    game.ts           Slot, PlayerSession, CodeCheckResult
```

---

## Testing & verification

See [`docs/TESTING.md`](docs/TESTING.md) for the full guide. Quick version:

```bash
npm run dev                    # start app + API
npx tsx scripts/check.ts       # static + live backend sanity checks
npm run typecheck              # strict TypeScript
npm run build                  # production build
```

For the stage acceptance rehearsal, open `/admin` and `/screen` in two tabs on
the same browser and step through the 10 scenes — see
[`docs/TESTING.md`](docs/TESTING.md).

---

## Documentation

- [`AGENTS.md`](AGENTS.md) — multi-agent collaboration boundaries & contracts
- [`docs/DESIGN.md`](docs/DESIGN.md) — visual & system design decisions
- [`docs/SETUP.md`](docs/SETUP.md) — implementation & deployment setup
- [`docs/TUTORIAL.md`](docs/TUTORIAL.md) — event-day operator walkthrough
- [`docs/TESTING.md`](docs/TESTING.md) — testing & rehearsal guide

---

## Caveats

- The participant game **requires the server to be reachable** for Join and
  reset. If the server is down mid-event, students already in can keep playing
  (pairing is local), but no new joins are possible until it's back. The stage
  show runs independently of the backend.
- Device-local binding (localStorage) is the strongest binding a browser can
  offer; a determined student could still clear site data, but they'd then
  need a *new* server reservation — the server enforces uniqueness and PIN for
  reset.
- There is **no** `isImposter`/`isSenior` field anywhere in the data. The
  imposter reveal is a stage experience owned by the projector (`/screen`).
- `/admin` ↔ `/screen` sync is **same-browser-profile only** (the stage
  laptop). It is not cross-device realtime.
