# Operation: Break the Ice

A live IEEE orientation experience for roughly 400–450 juniors plus 21 secretly planted senior imposters.

Participants scan the auditorium QR code, enter their name, receive a balanced random team + character, physically find teammates, form a mutually confirmed alliance, and later hunt the senior imposter hidden inside their team. The organiser controls the twist, clues, voting and reveal from a live admin console while the projector reacts in real time.

## Surfaces

- `/` — participant phone experience.
- `/screen` — auditorium projector.
- `/admin` — organiser controls.

## Architecture

One deployable service:

- React + Vite + TypeScript
- Express
- SQLite (`better-sqlite3`, WAL)
- SSE for realtime server -> browser updates
- JSON for static team/character content
- Docker for production

The server is authoritative. Pairing, phases, votes and imposter information are never trusted to browser-local state.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [AGENTS.md](AGENTS.md) before changing implementation.

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Vite serves the frontend and mounts the Express API in development.

Useful routes:

- `http://localhost:5173/`
- `http://localhost:5173/screen`
- `http://localhost:5173/admin`

## Production

```bash
npm run build
npm start
```

Or with Docker:

```bash
docker compose up -d --build
```

Persist `/data` so the SQLite event database survives restarts.

## Event flow

1. **JOINING** — QR + name entry + team/character reveal; normal two-person alliances may already form.
2. **PAIRING** — junior joining is now closed; finish remaining alliances and allow one final trio only for an odd team whose senior has joined.
3. **IMPOSTER_ALERT** — all phones/projector glitch into the twist.
4. **HUNT_CLUE_1** — hunt timer + first clue.
5. **HUNT_PHOTO** — team-specific childhood photo becomes available.
6. **VOTING** — participants vote within their own team.
7. **VOTES_LOCKED** — voting freezes.
8. **TEAM_REVEALS** — organiser reveals teams one-by-one.
9. **FINISHED** — closing state.

## Balancing

There are 21 permanent teams, but turnout is not assumed to be exactly 420.

Every junior is randomly allocated among the currently least-filled teams. Therefore junior counts remain within one person of each other as attendance changes.

Each senior joins through a private preassigned invite and does not participate in junior balancing.

## Pairing

Pairing is mutual and server-enforced:

- A enters/scans B's code.
- B receives a pair request.
- B accepts.
- Server atomically locks both into one alliance.

A browser cannot locally invent a pair, pair with an unjoined slot, or reuse an already paired person.

## Content

Public teams and character identities live in `config/teams.json`.

Real senior mappings, invite secrets and childhood photos are private server-side data and must not be committed or placed under `public/`.

See [docs/SETUP.md](docs/SETUP.md) for event preparation.
See [docs/ASSETS.md](docs/ASSETS.md) for the 588 configured artwork paths and curation workflow.
