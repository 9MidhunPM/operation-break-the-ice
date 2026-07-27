# Architecture

## Goal

Coordinate a physical orientation for an unknown number of juniors (expected around 420) split evenly across 21 teams, with one secretly assigned senior imposter per team.

## Deployment shape

```text
phones / projector / admin
           |
         HTTPS
           |
       reverse proxy
           |
   one Node container
   - Express API
   - SSE hub
   - React dist/
           |
      SQLite /data
```

No external database or realtime service is required.

## Static content vs live state

### Static public JSON

`config/teams.json` defines the public 21-team catalogue and character pools. It is safe to expose.

### Live mutable state

SQLite stores participants, team/character reservations, pair requests, alliances, votes, phase/timer, senior invites and event log.

### Private content

Senior invite tokens, team mappings, private clues and childhood photos stay server-side. Private images are served through authenticated phase-gated endpoints, never from `public/`.

## Participant identity

The browser creates one random opaque token and stores it in `localStorage`. Every API call sends it in `x-player-token`.

This token is **not authentication**; it is a stable recovery identifier for a live event. The server decides which participant record belongs to it.

Repeated `/api/join` with the same token is idempotent and returns the same participant.

## Junior allocation

Inside a transaction:

1. Return the participant if the token already joined.
2. Count juniors in each team.
3. Exclude teams with no unreserved character left.
4. Find the minimum junior count.
5. Randomly choose among minimum-count teams.
6. Randomly choose an unused character from that team excluding senior-reserved characters.
7. Generate a short public pairing code.
8. Insert the participant.

With N teams, this keeps team counts within ±1 until a team exhausts its character pool.

## Senior joins

An organiser prepares 21 private senior invite records, one per team.

A senior opens `/s/<invite-token>` or a QR containing that URL. On join the server reserves/returns the invite's team and character. From then on the participant API intentionally does not reveal the participant role.

Admin-only endpoints may expose senior readiness.

## Pair request state machine

`PENDING -> ACCEPTED | DECLINED | EXPIRED`

Creation validates:

- pairing phase is open;
- sender and target exist;
- same team;
- not same participant;
- neither is already in an alliance;
- no duplicate live request.

Acceptance runs in one transaction and revalidates both participants before creating the alliance.

## SSE

Clients connect to `/api/events` with their player token when applicable. Projector/admin use public/admin streams.

SSE carries invalidation/events, while the canonical state remains available through GET APIs.

On `open`, reconnect or focus, clients refetch their state.

## Event state

Single-row server state:

- `phase`
- `hunt_ends_at`
- `reveal_team_id`
- `updated_at`

Admin transitions validate allowed transitions. Explicit jump controls may exist for rehearsals only when requested with an admin-authorised `force` action.

## Voting

Voting is available only in `VOTING`.

A voter can vote only for a joined participant in their own team. `(voter_id)` is unique, so submitting again updates the existing choice while voting remains open.

Once `VOTES_LOCKED`, participant vote writes are rejected.

## Private photo release

`GET /api/me/clue-photo`:

- requires valid participant token;
- requires `HUNT_PHOTO` or a later appropriate phase;
- derives the participant's team on the server;
- returns only that team's private image bytes.

The client never receives a list of all senior photo URLs.

## Admin auth

Admin uses a server-side PIN from `ADMIN_PIN`.

Successful login creates an opaque, expiring admin session token stored in server memory/SQLite and returned to the browser. Do not embed the PIN in the frontend bundle.

## Failure behaviour

- A dropped SSE stream automatically reconnects.
- Participant refresh refetches `/api/me`.
- Projector refresh refetches `/api/public-state` and recent alliances.
- Admin refresh refetches `/api/admin/state` after session recovery.
- SQLite uniqueness/transactions protect against double joins and double pairing.
