# AGENTS.md — Multi-agent collaboration contract

This project was built in parallel by two coding agents. This file records the
ownership boundaries so future contributors know what to touch and what to
leave alone, and so the two halves integrate cleanly.

## Agent 1 — Participant game + backend

Owns the student-facing experience and the reservation server.

### Files

```
src/App.tsx
src/main.tsx
src/pages/GamePage.tsx
src/components/game/*
src/components/shared/*
src/lib/api.ts
src/lib/clientToken.ts
src/lib/session.ts
src/lib/game.ts
src/lib/useReducedMotion.ts
src/types/api.ts
src/types/game.ts
src/data/teams.ts
server/*
scripts/check.ts
vite.config.ts
package.json
tsconfig*.json
tailwind.config.js
postcss.config.js
```

### Responsibilities

- React Router shell + routes (`/`, `/screen`, `/admin`).
- Participant flow: join → name entry → reveal → play → pair lock.
- Single-process backend (Vite dev plugin + standalone prod server).
  Reservation API: `claim`, `me`, `name`, `release`, `stats`, `health`.
- SQLite persistence + least-fill team-balanced slot assignment.
- Static game data (`teams.ts`): 25 teams × 20 characters = 500 slots, with
  deterministic pair codes.
- sessionStorage/localStorage participant state + client token.
- Pairing rules (`checkTeammateCode`, `normalizeCode`).

---

## Agent 2 — Live event / stage experience

Owns the auditorium projector and the stage operator console. Does **not**
touch the participant game or the backend.

### Files

```
src/pages/ScreenPage.tsx
src/pages/AdminPage.tsx
src/components/stage/*
src/data/imposterReveal.ts
src/lib/stage.ts
src/lib/useStageStats.ts
public/imposters/README.txt
docs/DESIGN.md
docs/SETUP.md
docs/TUTORIAL.md
docs/TESTING.md
AGENTS.md
README.md
```

### Responsibilities

- `/screen` — full-viewport projector: 10 cinematic scenes, hidden operator
  tray, keyboard control, fullscreen.
- `/admin` — stage control panel: scene list, transport, photo controls, hunt
  timer, countdown, reset (with confirm), live stats panel.
- Stage state machine + same-browser sync (localStorage + `storage` event).
- Childhood photo reveal (grid / groups / single) with graceful placeholders.
- Live stats consumption (read-only `/api/stats` + `/api/recent-matches`),
  offline-safe polling, shared by `/screen` and `/admin`.

---

## Integration contract

### Routes

Agent 1 wires the router in `App.tsx` and lazy-imports the two page modules
Agent 2 provides:

```ts
const ScreenPage = lazy(() => import("@/pages/ScreenPage").then(m => ({ default: m.default })))
const AdminPage  = lazy(() => import("@/pages/AdminPage").then(m => ({ default: m.default })))
```

Both pages must export a **`default`** React component. Agent 1 wraps them in
a Suspense fallback so the project builds even while Agent 2 is mid-authoring.

### Shared data: `src/data/teams.ts`

Agent 1 owns this file. Agent 2 reads team names from it **without statically
importing it** (to avoid coupling during parallel dev and to survive the file
not existing yet). Agent 2 uses Vite's `import.meta.glob` in
`src/lib/stage.ts`:

```ts
const teamModules = import.meta.glob("../data/teams.{ts,tsx,...}", { eager: true });
```

- If `teams.ts` exists → real team names are used on the projector.
- If it doesn't → fallback labels (`Team 01`…`Team 25`).
- Agent 2 never modifies `teams.ts` to suit itself.

### Imposter data: `src/data/imposterReveal.ts`

Agent 2 owns this. It stores **only** `teamId → childhoodImage`. There is:

- NO senior name
- NO current photo
- NO personal data
- NO `isImposter` flag
- NO contact information

### Live stats API contract

Agent 2 consumes read-only endpoints from Agent 1's backend. The normalizer in
`useStageStats.ts` is permissive and accepts **both** shapes:

- `perTeam` as an **array** of `{ teamId, teamName, joined, capacity }`
  (Agent 1's actual shape), OR
- `perTeam` as a `Record<string, number>` (the originally planned shape).

Fields Agent 1 hasn't implemented yet (`pairsLocked`, `joinedLastMinute`,
`/api/recent-matches`) degrade to `0` / empty without errors. When Agent 1
adds them, the stage lights up automatically — no rework.

### Stage sync

`/admin` and `/screen` sync via `localStorage` key `ieee-orientation-stage-v1`
+ the `storage` event. This is **same-browser-profile only** (the stage
laptop). It is not cross-device realtime and is not described as such. Student
identity is never put in this store — only stage operator state.

---

## What each agent must NOT do

### Agent 1 must NOT

- Implement participant name entry, sessionStorage, character allocation,
  QR slots, pair codes, pair validation, or pair locking in stage files.
- Modify any file under `src/components/stage/`, `src/pages/ScreenPage.tsx`,
  `src/pages/AdminPage.tsx`, `src/data/imposterReveal.ts`, `src/lib/stage.ts`,
  or `src/lib/useStageStats.ts` to suit the participant game.
- Store senior names, `isImposter`, or any personal data in `teams.ts`.

### Agent 2 must NOT

- Implement participant name entry, sessionStorage, character allocation,
  student QR slots, pair codes, pair validation, or pair locking.
- Build a backend, admin authentication, student statistics, voting, senior
  names, senior accounts, server syncing, WebSockets, or databases.
- Modify Agent 1's owned files (`App.tsx`, `main.tsx`, `GamePage.tsx`,
  `teams.ts`, `server/*`, `vite.config.ts`, `package.json`, etc.) — except the
  README/docs which are shared documentation.

---

## Non-goals (neither agent builds these)

- Backend authentication server.
- Student records / senior records / permanent event state.
- Realtime networking between admin and projector (the stage laptop uses
  localStorage; that's it).
- Voting system.
- Digital identification of the 25 imposters (the reveal is **physical**).
- Cross-device sync of stage state.
