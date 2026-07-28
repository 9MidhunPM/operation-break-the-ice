# Event Runbook

## Before doors open

1. Confirm server health and persistent SQLite volume.
2. Open `/admin` and authenticate.
3. Open `/screen` fullscreen on projector.
4. Confirm 20 senior invite records are prepared.
5. Have seniors join via their private links before or alongside juniors.
6. Verify admin shows senior readiness without exposing it publicly.

## Joining

Projector displays event QR.

Anchor instruction: scan, enter your name, press Join, wait for your character/team reveal.

Admin watches junior totals and per-team balancing. The **Team Rosters** tab shows every joined person by team, with character, pair code, senior marker, and paired/unpaired state; use its search box to locate someone quickly.

## Pairing

Only after the arrival window is effectively closed, Admin moves to `PAIRING`. This closes **new junior joins**. Existing participants can keep pairing; seniors may still use their private invite during this phase. Odd-team trios are allowed only here, and only after that team's senior has joined.

Anchor instruction: physically find someone from your team who is not already paired; exchange code/QR; one person sends the request and the other accepts.

Projector shows newly formed alliances and aggregate progress.

## Gather

Once most/all participants are locked, anchor asks completed teams to gather in their designated areas.

## Twist

Admin triggers `IMPOSTER_ALERT` only on the anchor's cue.

Phones/projector transition together.

## Hunt

Start `HUNT_CLUE_1` with the configured countdown. Participants interrogate teammates; senior imposters continue acting as juniors.

At the desired moment release `HUNT_PHOTO`. Every participant sees only their own team's childhood-photo clue.

## Voting

Open `VOTING` after the hunt.

Participants vote for one person currently joined in their team. Admin can watch totals but results remain off-projector until reveal.

Lock voting before reveal.

## Reveal

Advance through teams one-by-one from admin. Projector shows the team's accusation/result, then the organiser triggers the actual imposter reveal for that team.

Finish with all senior imposters standing/revealing together.

## Emergency fallbacks

- If projector fails: phones remain authoritative for participant state; anchor can continue verbally.
- If SSE briefly disconnects: wait for automatic reconnect; clients refetch state.
- If a participant needs to be located during the event, use **Admin → Team Rosters** and search by name, character, or pair code. Individual participant reset is intentionally not exposed; use the full event reset only when the current session is disposable.
- Do not restart/delete the DB to fix an individual participant problem.
