# Setup & Implementation Guide

Everything you need to run, build, and deploy **Operation: Break the Ice**.

---

## Prerequisites

- **Node.js 18+** (tested on Node 20 and 22; Node 26 also works)
- **npm 9+** (ships with Node)
- A modern browser (Chrome/Edge recommended for the projector — best fullscreen
  + `storage` event behaviour)

---

## 1. Local development

```bash
git clone git@github.com:9MidhunPM/operation-break-the-ice.git
cd operation-break-the-ice
npm install
npm run dev
```

Open **http://localhost:5173**.

That single command runs **everything**: the React app (with HMR) **and** the
reservation API on the same port. There is no second process to start.

> The backend is mounted into Vite's dev server via `server/plugin.ts`
> (`configureServer` hook). The app calls same-origin `/api/*` — no CORS, no
> env vars needed for dev.

### Environment (optional for dev)

Copy `.env.example` to `.env` if you want to override defaults:

```bash
cp .env.example .env
```

| Var             | Default              | When you need it                          |
| --------------- | -------------------- | ----------------------------------------- |
| `ORGANISER_PIN` | `220806`             | Always set a real value in production      |
| `PORT`          | `8080`               | Production server only (dev uses 5173)    |
| `DB_PATH`       | `server/data.sqlite` | Move the DB elsewhere                     |

If `ORGANISER_PIN` is unset, the server logs a warning and uses the default —
fine for local dev, **not** for production.

---

## 2. The three pages

| URL                     | What it is                                  |
| ----------------------- | ------------------------------------------- |
| `http://localhost:5173/`        | Participant game (phones)                  |
| `http://localhost:5173/screen`  | Projector (stage laptop, second monitor)   |
| `http://localhost:5173/admin`   | Stage operator console (stage laptop)      |
| `http://localhost:5173/screen?controls=1` | Projector + hidden operator tray  |

For the **stage laptop workflow**, open `/admin` and `/screen` in two windows
on the **same browser profile** (so `localStorage` syncs between them).

---

## 3. Production build & run

```bash
npm run build    # tsc -b (type-check) + vite build → dist/
npm start        # tsx server/index.ts → serves dist/ + /api on PORT
```

`npm start` runs **one Node process** that:

1. Serves the built static files from `dist/`.
2. Handles `/api/*` with the reservation API + SQLite.

Default port `8080`. Override with `PORT=...`.

The SQLite file (`server/data.sqlite`) is created automatically on first run
and persists across restarts — a server crash mid-event will **not** wipe 500
students' assignments.

---

## 4. Deployment options

### Option A — Laptop on venue Wi-Fi (simplest)

1. On the stage laptop: `npm run build && ORGANISER_PIN=<secret> npm start`.
2. Find the laptop's LAN IP (e.g. `192.168.1.50`).
3. Students browse to `http://192.168.1.50:8080/` on their phones.
4. The projector opens `http://localhost:8080/screen` on the same laptop.

**Pros:** zero cloud dependency, full control.
**Cons:** depends on venue Wi-Fi quality; ensure the laptop stays awake and
plugged in. Use a 5 GHz network if possible.

### Option B — Cloud host (Render / Fly / Railway / Railway)

1. Push to GitHub.
2. Create a service from the repo. Build command `npm run build`, start command
   `npm start`.
3. Set env vars: `ORGANISER_PIN=<strong secret>`, `PORT` (most hosts set this).
4. **Persistent disk required** for `server/data.sqlite` to survive restarts.
   On hosts without persistent disks, set `DB_PATH` to a mounted volume path.
5. Point students at the host URL.

**Pros:** reachable from any network, survives laptop failure.
**Cons:** needs a host with a persistent volume (free tiers often wipe disk on
restart — use a paid tier or a managed SQLite like Turso for reliability).

> **Note:** `better-sqlite3` is a native module. Most cloud hosts compile it
> on install. If your host uses a read-only filesystem, ensure the build step
> runs before start (it does with `npm run build`).

---

## 5. Adding your real content

### Teams & characters

Edit **one file**: [`src/data/teams.ts`](../src/data/teams.ts).

- Replace `RAW_TEAMS` with your 25 real teams (`id`, `name`, `color`).
- Replace `CHARACTER_NAME_POOL` with real character names, or hand-author the
  `characters` arrays per team.
- Drop artwork into `/public/art/teams/<id>.png` and
  `/public/art/characters/<slot>.png`. Missing art falls back to a generated
  placeholder — the UI never breaks.

The server imports the same file, so client and server always agree on slot
ids and pair codes.

### Imposter childhood photos

Drop 25 square images into `public/imposters/`:

```
public/imposters/team-01.jpg   →  team T01
public/imposters/team-02.jpg   →  team T02
...
public/imposters/team-25.jpg   →  team T25
```

See [`public/imposters/README.txt`](../public/imposters/README.txt). Until you
add them, the projector shows honest "Photo Pending" placeholders.

---

## 6. Scripts reference

| Command                  | What it does                                              |
| ------------------------ | --------------------------------------------------------- |
| `npm run dev`            | Vite dev server (app + API, HMR)                          |
| `npm run build`          | `tsc -b` + `vite build` → `dist/`                         |
| `npm start`              | Production server (serves `dist/` + `/api`)              |
| `npm run preview`        | Vite preview of the built app (no API unless via plugin)  |
| `npm run typecheck`      | `tsc -b --noEmit` (strict, no output)                     |
| `npm run lint`           | ESLint (requires an eslint config)                        |
| `npx tsx scripts/check.ts` | Static + live backend sanity checks (dev server running) |

---

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot find module './server/plugin'` | Run `npm install` (the plugin is local; this means deps aren't installed) |
| `better-sqlite3` native build fails | Ensure Python 3 + build tools are installed (`npm install` runs postinstall) |
| Projector doesn't update when I press admin buttons | Confirm both tabs are the **same browser profile**; `localStorage` doesn't sync across profiles/incognito |
| Stats strip says "offline" | Backend not running or `/api/stats` unreachable; start `npm run dev` |
| Students get "All slots claimed" | All 500 slots are taken; run RESET on the admin or clear the DB |
| Port 5173/8080 already in use | Set `PORT` env var (prod) or use `--port` flag (dev) |

---

## 8. Resetting the database (dev only)

To wipe all reservations and start fresh locally:

```bash
rm server/data.sqlite server/data.sqlite-shm server/data.sqlite-wal
```

The server recreates an empty database on next start.

> **Never commit `server/data.sqlite`.** It contains participant names. The
> `.gitignore` excludes it.
