Imposter Childhood Photos
=========================

Drop the 25 childhood photo files here using these exact names:

  team-01.jpg   (team T01)
  team-02.jpg   (team T02)
  ...
  team-25.jpg   (team T25)

Requirements
------------
- Square or near-square images work best (the projector tiles are ~1:1).
- Resolution: at least 600×600, ideally 1000×1000+ for the single-large view.
- Format: .jpg (matched by src/data/imposterReveal.ts).

If a file is MISSING, the projector gracefully shows an honest
"Photo Pending" placeholder tile with the team id — it never fabricates a
photo that was not supplied.

Team names
----------
The stage reads real team names from src/data/teams.ts when present. If that
file is absent (parallel development), the projector uses fallback labels
("Team 01"…"Team 25"). Nothing here stores senior names or personal data.
