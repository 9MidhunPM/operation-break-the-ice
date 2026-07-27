# Design — Operation: Break the Ice

This document records the visual, interaction, and system-design decisions
behind the app, with emphasis on the **stage experience** (the projector +
operator console), which is the most design-intensive part.

---

## 1. Visual tone

**Cinematic · secret-mission · futuristic · dark · premium · energetic.**

The stage should feel like a mission-control broadcast, not a corporate slide
deck or a student dashboard. The aesthetic references superhero/espionage
cinema without copying any trademarked logos or assets.

### Principles

- **Huge typography.** Titles are sized with `clamp()` so they scale from a
  1366×768 laptop window to a 1920×1080 projector and remain readable from the
  back of a hall. Welcome title: 102px @ 768p, 144px @ 1080p.
- **Negative space.** The projector is never crowded. One hero idea per scene.
- **Motion with restraint.** Smooth, slow, deliberate. No rapid strobing. All
  animation is disabled under `prefers-reduced-motion`.
- **One accent per mood.** Teal = normal/active, red/orange = warning/imposter,
  gold = closing.

---

## 2. Colour system

Defined as CSS custom properties in `stage.css`, scoped to `.stage-root` so
they never leak into the participant game.

| Token              | Value      | Used for                          |
| ------------------ | ---------- | --------------------------------- |
| `--stage-bg`       | `#05060c`  | deep space background             |
| `--stage-bg-2`     | `#0a0e1c`  | gradient top                      |
| `--stage-fg`       | `#eef2ff`  | primary text                      |
| `--stage-fg-dim`   | `#9aa6c8`  | labels, fine print                |
| `--stage-accent`   | `#5eead4`  | teal — normal/active states       |
| `--stage-accent-2` | `#38bdf8`  | cyan — gradient companion         |
| `--stage-warn`     | `#ff4d4d`  | red — warning/imposter/final      |
| `--stage-warn-2`   | `#ff7a3c`  | orange — emphasised warn text     |
| `--stage-gold`     | `#ffd166`  | closing/celebration               |

The `StageShell` applies **tone variants** (`tone-warn`, `tone-gold`) that
re-tint the background gradient, grid lines, and particles to match the scene's
emotional register.

---

## 3. Typography

- **Family:** Inter (with Segoe UI / system-ui fallbacks). Display weight 900
  for titles, 700 for subtitles, 500 for fine print.
- **Scale:** fluid via `clamp(min, vw, max)`. Titles up to `9rem` on the
  projector; scene copy up to `2.6rem`.
- **Treatment:** titles use a vertical white→accent gradient clipped to text,
  plus a soft glow shadow. This reads as "premium broadcast" rather than flat.

---

## 4. The stage shell — layered backdrop

Every projected scene is wrapped by `StageShell`, which renders five stacked
layers:

```
z0  gradient        radial teal/cyan blooms + vertical gradient, slowly drifting
z1  grid            faint 64px lines, masked to a radial fade, gentle pulse
z2  particles       8 floating dots, slow vertical drift (decorative)
z3  scanlines       very faint horizontal lines (CRT/subtle-tech texture)
z4  vignette        darkens edges to focus the centre
z5+ scene content   the actual title/subtitle/timer
```

All ambient layers can be disabled per scene (e.g. photo scenes set
`ambient={false}` for image clarity).

---

## 5. Scene-by-scene design

### Welcome
Clean. IEEE mark pill, eyebrow, giant title, divider, subtitle. Stats rail at
the bottom once the backend is live.

### Find Your Team
"MISSION 01" eyebrow, three short imperatives, fine-print scan instruction.

### Game In Progress
Three counter-rotating orbital rings + a pulsing core, ambient copy. Designed
to stay up a long time without feeling static.

### Disturbance
A single non-strobing flicker (sub-3Hz, accessibility-safe), an animated
ellipsis, then "Something isn't right." Short and theatrical. Under
`prefers-reduced-motion`, only the text shows.

### Imposter Warning
4 manually-advanced beats. A pulsing red "HIGH ALERT" badge, giant warn-line
titles with one emphasised word per beat, and a dot indicator showing
progression. Nothing auto-advances — the operator controls the beat.

### Photo Reveal
Three modes:
- **Grid** — full 5×5, every tile shows team id + name + childhood image.
- **Groups** — 5 per page with pager dots.
- **Single** — one 640px frame, large team name, `n / 25` counter.

Missing images render an honest striped "Photo Pending" placeholder — never a
broken image, never a fabricated one.

### Hunt
Giant `mm:ss` timer (tabular-nums), turns red and pulses in the final 30s,
shows "TIME'S UP" at zero. The stats rail hides while the timer runs so it
never competes with the countdown.

### Final Countdown
"Lock In Your Guess." → a single huge number (5→1, one per second, pop-in
animation) with a 5-segment tick bar → "DECISION LOCKED." (pulsing). Stops
there — the operator advances.

### Final Reveal
3 beats, climax of the show. Silhouette arches rise behind giant red-glowing
text: "THE MOMENT OF TRUTH" → "IMPOSTERS…" → "REVEAL YOURSELVES."

### Closing
Gold tone. "MISSION COMPLETE" pill, "WELCOME TO IEEE.", an aspirational
subtitle.

---

## 6. Stage state machine

A single source of truth persisted in `localStorage` under
`ieee-orientation-stage-v1`:

```ts
{
  stage,               // 10-value enum
  warningBeat,         // 0..3 (imposter) and 0..2 (final-reveal) sub-beats
  photoMode,           // grid | group | single
  photoIndex,          // page (group) or team (single)
  huntDurationSeconds, // configurable, default 300
  huntStartedAt,       // epoch ms or null
  countdownStartedAt,  // epoch ms or null
}
```

**Sync model (Option B):** `/admin` writes → saves to localStorage + updates
its own React state immediately → the browser fires a `storage` event in the
other tab → `/screen`'s listener updates. Refresh either page → re-reads
localStorage → lands on the correct stage. **Same browser profile only.**

Navigation is always manual. Timers never auto-advance important scenes.

---

## 7. Operator ergonomics

The operator is nervous and running a live show. Design choices:

- **Large targets.** Admin cards are big, clearly labelled, grouped.
- **Rehearsal-first.** The scene grid lets you jump to any scene instantly.
- **No accidental resets.** RESET opens a confirmation dialog.
- **Keyboard everywhere.** `→`/`←` on both pages; full control from `/screen`
  via the hidden tray (`O` key or `?controls=1`).
- **Forgiving.** Refresh never loses position. Offline stats keep last-known
  values. Missing images show placeholders. Nothing crashes if the backend is
  absent.

---

## 8. Participant game design

- **Mobile-first.** Students join on their phones. The game UI is a vertical,
  touch-friendly flow.
- **Locked identity.** Team + character are assigned once and never change.
  This is the whole point of the server — uniqueness + balance.
- **Editable name only.** A pencil icon opens a name dialog; team/character
  stay fixed.
- **Local pairing.** Code exchange + validation is pure client logic
  (`game.ts`). No backend round-trip for pairing keeps it fast and offline-safe
  once joined.

---

## 9. Accessibility

- `prefers-reduced-motion` disables every animation (background drift, glitch,
  countdown pop, ticker scroll).
- Strong contrast on all text (near-white on near-black; dim grey only for
  non-essential labels).
- `aria-live="polite"` on the joined counter and timer; `aria-label`s on all
  operator buttons.
- No rapid flashing anywhere. The disturbance flicker is capped well below
  photosensitivity thresholds.
- Countdown text remains readable without relying on animation (the number is
  plain text, not only a motion effect).

---

## 10. Performance

- **Lazy routes.** `ScreenPage` and `AdminPage` are separate chunks — the
  participant bundle isn't weighed down by stage code.
- **Cheap polling.** One shared `useStageStats` hook polls every 2.5s; ambient
  scenes subscribe. No WebSockets.
- **Static assets.** Childhood photos are plain files in `public/imposters/`,
  loaded with `loading="lazy"` and `decoding="async"`.
- **No heavy libs.** No charting, no animation libraries — everything is CSS
  keyframes and plain React.
