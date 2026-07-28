# Setup

## 1. Environment

Copy `.env.example` to `.env` and set strong production values.

Important values:

- `PORT`
- `DB_PATH`
- `ADMIN_PIN`
- `PUBLIC_BASE_URL`
- `PRIVATE_CONTENT_DIR`

## 2. Public team content

Edit `config/teams.json`.

Requirements:

- exactly 20 enabled teams for the current event;
- unique team IDs;
- unique character IDs inside each team;
- at least 28 characters/team recommended;
- artwork paths point to files under `public/assets/`;
- no senior/imposter metadata in this file.

## 3. Character artwork

Recommended source dimensions: portrait/mobile artwork around 1080×1920, exported to compressed WebP where possible.

Only the participant's active character artwork should be critical for their phone experience. Missing artwork must fall back to a gradient/initial-based card.

## 4. Senior setup

Real senior configuration is private and is not committed.

Use the provided setup script/template to create one senior invite per team with:

- team ID;
- reserved character ID;
- senior display name for admin/reveal purposes;
- clue text;
- childhood photo filename.

The invite secret should be random and only the hash stored in SQLite.

Send each senior only their own invite URL/QR.

## 5. Childhood photos

Place real photos in the configured private content directory, e.g. `/data/private/imposters/`.

Do not place them under `public/`.

## 6. Rehearsal

Before event day test:

- 20 senior invites can join;
- at least 2 juniors in several teams can mutually pair;
- refresh restores identity;
- duplicate pairing is rejected;
- projector receives alliance feed;
- admin can trigger every phase;
- clue photo is inaccessible before release;
- voting rejects cross-team targets;
- Docker restart preserves DB.

## 7. Event reset

After **FINISHED**, participant phones intentionally keep their team/character identity visible. Use the explicit admin reset endpoint/control only when you actually want to clear those assignments for the next run. Never manually delete the SQLite file during a live event.
