# Testing Strategy

## Automated

`npm test` should cover domain/server invariants without needing a browser:

- 20-team catalogue validation;
- balanced junior allocation;
- idempotent join;
- senior-reserved character excluded from junior allocation;
- pair request same-team validation;
- mutual acceptance creates exactly one alliance;
- double acceptance remains safe;
- already-paired participant cannot pair again;
- event phase gates pairing/voting/private photos;
- one vote per voter with update while open;
- cross-team vote rejection;
- admin phase transitions;
- stats aggregation.

## Build gates

Run:

```bash
npm run typecheck
npm test
npm run build
```

## Manual phone checks

At a narrow mobile width:

- name field is usable with on-screen keyboard;
- character art does not hide essential controls;
- code is readable at arm's length;
- pair request Accept/Decline cannot be accidentally confused;
- alert/hunt/photo/vote states survive refresh;
- missing artwork shows a useful fallback.

## Realtime checks

With two participant tabs and projector/admin open:

- pair request appears without manual refresh;
- accept updates both participants;
- projector immediately shows the latest alliance;
- admin stats update;
- phase change updates all clients;
- disconnect/reconnect refetches canonical state.

## Security/privacy checks

Search built output/source for:

- real invite secrets;
- `isImposter` / `isSenior` in participant payloads;
- private photo filenames/paths;
- admin PIN;
- senior mapping in public JSON.

Attempt direct photo endpoint access before `HUNT_PHOTO`; expect rejection.

## HTTP black-box suite

Run `npm run test:blackbox` after a production build. It launches the real Express server on an isolated SQLite database and validates the app only through HTTP/SSE endpoints, including 420 junior joins, all 20 senior invites, pairing, phase gating, voting, reveal secrecy, and reset.

`npm run verify` runs typecheck, logic tests, production build, black-box tests, and dependency audit in sequence.
