# Testing & Verification Guide

How to verify **Operation: Break the Ice** works before the event.

---

## 1. Automated checks

### Type checking (strict)

```bash
npm run typecheck      # tsc -b --noEmit
```

Must exit 0. The project uses `strict`, `noUnusedLocals`,
`noUnusedParameters`, `noFallthroughCasesInSwitch`.

### Production build

```bash
npm run build
```

Confirms `tsc -b` + `vite build` succeed and chunks are emitted:
`ScreenPage-*` and `AdminPage-*` should be **separate** lazy chunks
(confirming the router splits them out of the participant bundle).

### Backend sanity checks (requires dev server)

```bash
npm run dev            # in one terminal
npx tsx scripts/check.ts   # in another
```

This script verifies:

- Static dataset integrity (25 teams, 500 unique slots, valid pair codes).
- Pairing rules: valid match, wrong-team rejection, self-code rejection.
- Live backend: `POST /api/claim` returns a unique slot, idempotency on the
  same token, `GET /api/me` restores it, `PATCH /api/me/name` updates name,
  `GET /api/stats` returns counts + per-team array, `POST /api/release` with
  wrong PIN → 403, correct PIN → ok and slot freed.

Set the PIN via env if you've changed the default:

```bash
ORGANISER_PIN=<your-pin> npx tsx scripts/check.ts
```

---

## 2. Manual participant-flow test

Open `http://localhost:5173/`.

1. Click **Join Game** → a slot is assigned server-side.
2. Enter your name → team reveal → character reveal → player card with code.
3. Open a **second tab** (incognito or clear localStorage) → Join → get a
   **different** slot.
4. To test pairing, both players must be in the **same team**. Join until you
   land two same-team players (or temporarily lower the pool), then:
   - Enter a wrong-team code → `WRONG TEAM`.
   - Enter your own code → `THAT'S YOUR OWN CODE`.
   - Enter a valid teammate's code → pair locks.
5. Refresh → assignment + pairing persist (localStorage).
6. Click the **pencil** (edit name) → name changes; team/character don't.
7. Click **Reset my game** → enter PIN (`220806` default) → slot released,
   back to Join. The old slot becomes available for someone else.

### Backend uniqueness check

Open many tabs quickly and Join in each. Every tab must get a **different**
team/character. Confirm via:

```bash
curl -s http://localhost:5173/api/stats | jq '.joined'
```

---

## 3. Stage acceptance rehearsal (the big one)

This mirrors the live event end to end.

### Setup

1. `npm run dev`.
2. Open **`/admin`** in window A (operator screen).
3. Open **`/screen`** in window B (drag to second monitor / fullscreen with
   `F`). **Same browser profile.**
4. Confirm both show **Welcome**.

### Run the full sequence

| # | Action (on `/admin` or `/screen`) | Expected on `/screen` |
| - | --- | --- |
| 1 | (load) | WELCOME, FUTURE INNOVATORS |
| 2 | click FIND YOUR TEAM | MISSION 01 — Find Your Team/Character/Ally |
| 3 | click GAME IN PROGRESS | FIND YOUR PEOPLE. BUILD YOUR ALLIANCE. |
| 4 | click TRIGGER DISTURBANCE | glitch → "Something isn't right." |
| 5 | click REVEAL IMPOSTER MESSAGE | HIGH ALERT / WARNING |
| 6 | click Next Beat ×3 | beat2 IMPOSTER IN EVERY TEAM → beat3 PLAYING ALONGSIDE YOU |
| 7 | click SHOW CHILDHOOD PHOTOS | 5×5 grid: 25 Teams. 25 Imposters. |
| 8 | Single Large → click T01 | one big photo + "1 / 25" + team name |
| 9 | SHOW HUNT SCENE → set 0:10 → ▶ START HUNT | FIND THE IMPOSTER + 00:10 timer |
| 10 | wait 10s | TIME'S UP (no auto-advance) |
| 11 | START FINAL COUNTDOWN → ▶ START | LOCK IN YOUR GUESS → 5..1 → DECISION LOCKED |
| 12 | IMPOSTERS REVEAL YOURSELVES → Next Beat ×2 | THE MOMENT OF TRUTH → IMPOSTERS… → REVEAL YOURSELVES |
| 13 | CLOSING SCREEN | MISSION COMPLETE. WELCOME TO IEEE. |

### Persistence & sync checks

14. Refresh `/screen` → stays on the same scene. ✅
15. Refresh `/admin` → "Current Projector Stage" is unchanged. ✅
16. Drive from `/screen` keyboard (`→`/`←`) → `/admin` indicator updates. ✅
17. Drive from `/admin` → `/screen` updates within ~100ms. ✅
18. Click RESET STAGE → confirm → both return to Welcome. ✅

### Photo placeholder check

With no images in `public/imposters/`, every photo tile shows a striped
**"Photo Pending"** placeholder with the team id. Drop a test
`public/imposters/team-01.jpg` → that tile shows the real image; others stay
pending.

---

## 4. Live stats verification

1. Join a few players (or `POST /api/claim` a few times via curl/script).
2. On `/screen` (Welcome / Game Active / Hunt-waiting): the **stats rail**
   appears at the bottom showing `N / 500 joined`, a progress bar, and
   `pairs locked`.
3. On `/admin`: scroll to **Live Stats** — big tiles (joined/total/pairs/+per-min),
   a 25-row **Team Fill** grid, and a **Recently Matched** feed.
4. Kill the dev server → the rail keeps showing last-known numbers with a
   **dimmed dot**; the show continues. Restart → numbers resume updating.

> `/api/recent-matches` may not exist yet (Agent 2 planned, Agent 1 not yet
> implemented). Until it does, the "Recently Matched" feed is empty and the
> rest works normally — no errors.

---

## 5. Accessibility & responsive checks

- **Reduced motion:** enable "Reduce motion" in your OS / DevTools → all
  background drift, glitch, countdown pop, and ticker animation stop. Text
  remains fully readable.
- **Projector sizes:** test `/screen` at 1920×1080 (title ~144px) and 1366×768
  (title ~102px). No scrolling at either. Use DevTools device toolbar.
- **Non-16:9:** resize to a tall/narrow window → layout reflows, no clipping
  of essential text.
- **Contrast:** titles are near-white on near-black; dim grey is used only for
  non-essential labels.

---

## 6. Performance sanity

- `/screen` lazy chunk: ~14 KB gzipped (excludes the participant bundle).
- `/admin` lazy chunk: ~9 KB gzipped.
- Stats polling: one shared hook, 2.5s interval, `Promise.allSettled` (one
  failure doesn't block the other).
- Photos: `loading="lazy"`, `decoding="async"`, CSS `object-fit: cover`.

---

## 7. Headless / automated stage test (optional)

The repo was verified during development with a Playwright script that:

- Opens `/admin` + `/screen` in one browser context (shared localStorage).
- Drives the full 10-scene sequence, including beats, photo modes, hunt timer,
  countdown, refresh-persistence, keyboard nav, and reset.
- Asserts cross-tab sync and offline resilience.

If you add Playwright as a dev dependency, you can re-create this against the
running dev server. The key invariant: **`/admin` writes → `storage` event →
`/screen` reads within one tick.**
