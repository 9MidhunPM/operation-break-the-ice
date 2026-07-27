# AGENTS.md — Operation: Break the Ice

Read this before changing code.

## Product truth

This repository powers a **live, in-person IEEE orientation game**. The website coordinates a physical social experience; it is not the experience by itself.

There are three surfaces:

- `/` — participant phone UI for juniors and secretly invited senior imposters.
- `/screen` — auditorium projector.
- `/admin` — organiser control panel.

The server is authoritative for every important event rule. Browsers are views/controllers, never the source of truth.

## Event flow

The canonical phases are:

`JOINING -> PAIRING -> IMPOSTER_ALERT -> HUNT_CLUE_1 -> HUNT_PHOTO -> VOTING -> VOTES_LOCKED -> TEAM_REVEALS -> FINISHED`

The organiser advances phases manually from `/admin`. Phase changes are broadcast over SSE and every client must also be able to recover the current state with normal GET APIs after refresh/reconnect.

## Architecture contract

Keep the architecture deliberately small:

- React + Vite + TypeScript.
- One Express server in production.
- SQLite (`better-sqlite3`) for all mutable event state.
- Server-Sent Events (SSE) for server -> browser notifications.
- Ordinary HTTP requests for browser -> server actions.
- JSON for static public content (teams/characters/theme metadata).
- Docker for deployment.

Do **not** introduce Redis, PostgreSQL, PocketBase, WebSockets, queues, an ORM, microservices, or extra services unless a demonstrated requirement cannot be met by the architecture above.

## Server authority

The server owns:

- participant browser tokens and recovery;
- junior team + character assignment;
- senior invite/reserved team assignment;
- pair requests;
- pair acceptance/decline;
- locked alliance membership;
- event phase;
- hunt deadline;
- clue/photo availability;
- votes;
- team reveal progress;
- projector recent-alliance feed;
- event statistics.

`localStorage` may hold only a stable browser token and harmless UI preferences. Never store canonical pairing, team assignment, voting, event phase or senior identity only on the client.

## Team allocation

The event uses **21 permanent teams**. Actual junior turnout is unknown.

For every junior join:

1. count joined juniors per team;
2. find the minimum count among teams with an available junior character;
3. randomly choose among those minimum-count teams;
4. randomly choose an unused, non-senior-reserved character in that team;
5. reserve both in one transaction.

This keeps junior team sizes within ±1 while preserving randomness.

Senior reservations do not count toward junior balancing.

Each team should have at least 28 public character identities so the system can tolerate higher-than-expected turnout.

## Mutual alliance contract

An alliance is valid only after mutual server-confirmed acceptance.

Required flow:

1. A enters/scans B's public code.
2. Server verifies both exist, same team, different people, and both are unlocked.
3. Server creates a short-lived pending request.
4. B receives it via SSE and can Accept/Decline.
5. On Accept, one DB transaction re-validates both and atomically creates the alliance.
6. Both phones update from server state.
7. Projector/admin receive the resulting alliance event/stats.

No participant may belong to more than one locked alliance.

If a final team has an odd live headcount, support for one 3-person alliance may be added explicitly, but do not create trios by default or infer them client-side.

## Senior / imposter secrecy

Each team has exactly one senior imposter, assigned before the event with a secret invite token.

A senior invite reserves one team and one character. After joining, the senior's participant payload must look like a normal participant payload.

Never send these to the participant frontend:

- `isImposter` / `isSenior`;
- senior role flags;
- other teams' senior mappings;
- childhood photo paths before release;
- answer keys.

Senior mapping and childhood-photo information must not live in `public/`, the public team JSON, or a client bundle.

Private clue/photo endpoints must verify participant team and current event phase before serving data.

## Realtime rules

SSE is a notification channel, not the only state store.

Typical broadcast events:

- `snapshot-invalidated` — client should refetch its state;
- `pair-request` — target has a new request;
- `alliance-formed` — projector/admin feed;
- `stats-changed`;
- `phase-changed`;
- `timer-changed`;
- `vote-changed`;
- `reveal-changed`.

Reconnect must be safe. Clients must refetch current state after reconnect/focus.

## Data boundaries

### Public static JSON

`config/teams.json` may contain:

- team IDs/names/theme colours;
- public character IDs/names;
- public artwork paths;
- public labels/taglines.

### Private runtime/config

Never expose as static files:

- admin PIN/password;
- senior invite token hashes;
- senior/team mappings;
- private clues/answers;
- childhood-photo file locations.

Production secrets belong in environment variables and/or mounted private files.

### SQLite

Use simple prepared SQL. Prefer constraints/transactions to duplicate TypeScript guard code.

Conceptual tables:

- `participants`
- `senior_invites`
- `pair_requests`
- `alliances`
- `alliance_members`
- `votes`
- `event_state`

## UX contract — participant

1. Enter name.
2. Join.
3. Animated welcome using the entered name.
4. PS5-inspired full-screen character reveal.
5. Persistent team/character/code/QR card.
6. Physically find a same-team participant.
7. Send or receive a mutual alliance request.
8. Locked alliance state.
9. Server-driven imposter alert/hunt/clue/photo/vote states.

Keep the phone UI cinematic and simple. Character artwork should dominate the screen. Avoid dashboard-like density.

## UX contract — projector

During join/pairing:

- QR/join prompt;
- junior joined count;
- alliance count;
- recent alliance feed/animation.

During the twist/hunt/reveal:

- full-screen cinematic state;
- timer when relevant;
- team-by-team reveal controlled by admin.

Do not queue every historical alliance animation forever; show only the freshest events.

## UX contract — admin

Admin should be operational, not theatrical. It needs:

- total juniors;
- senior readiness;
- per-team headcounts;
- alliances/unpaired counts;
- current phase/timer;
- phase transition controls;
- clue/photo controls;
- voting state/results;
- reveal controls;
- reset tools with confirmation.

Admin actions are server-authoritative and protected by an admin PIN/session.

## Code organisation

Organise by domain, not by artificial agent ownership:

- `src/pages` — participant/projector/admin route surfaces.
- `src/components` — presentational UI.
- `src/lib` — browser API/SSE/session helpers only.
- `src/types` — shared serialisable contracts.
- `server` — persistence, allocation, pairing, event state, voting, auth.
- `config` — public static content.
- `private` — local-only examples/placeholders; real sensitive files are gitignored.
- `docs` — architecture, setup, testing, event runbook.

Keep business rules out of React components.

## Quality gates

Before a substantial change is considered done:

1. `npm run typecheck`
2. `npm run build`
3. `npm test`
4. inspect duplicate rules between client/server;
5. remove dead compatibility code from the old architecture;
6. remove unnecessary abstractions/dependencies;
7. search for privacy leaks (`isImposter`, private photo paths, invite secrets);
8. inspect transactional race conditions around join/pair/vote;
9. verify refresh/reconnect recovery;
10. verify narrow phone layouts;
11. verify Docker build/run configuration.

Prefer deleting obsolete code over preserving adapters for an architecture that no longer exists.

## Event-day reliability principles

- Duplicate Join taps are idempotent.
- Refresh restores participant state from the server.
- SSE reconnects and resynchronises.
- Duplicate pair accepts cannot create two alliances.
- Votes are one-per-voter and editable only while voting is open.
- Private photo/clue data stays unavailable before its phase.
- SQLite uses WAL and a persistent volume.
- Static image failure must not break the participant's basic identity/card.
- Reliability beats cleverness.

## Non-goals for the first production event

Do not add unless explicitly requested:

- student accounts/passwords;
- long-term profiles;
- multi-event tenancy;
- chat;
- complex analytics;
- push notifications outside the open browser;
- external managed databases;
- AI face recognition;
- elaborate role-management systems;
- unnecessary animation frameworks.


### Surprise/secrecy boundary

- Public projector state must never expose `seniors`, per-team senior counts, total headcount including seniors, invite data, or imposter identity before reveal.
- The participant's initial bundle must not contain the post-alert imposter/voting/reveal copy. Keep `ParticipantTwist` lazy-loaded.
- Normal two-person alliances may form in `JOINING`; trios are allowed only in `PAIRING`, after junior joining is closed and that team's senior has joined.
- A senior browser uses a separate local token from a junior browser session so rehearsal on the public QR cannot consume or mask the senior invite.
