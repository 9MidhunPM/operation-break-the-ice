# Tutorial — Event-Day Operator Walkthrough

This is the step-by-step script for running **Operation: Break the Ice** live,
from setup to the final "REVEAL YOURSELVES" moment.

---

## Before the event (15 min before doors)

### 1. Start the system

On the **stage laptop**:

```bash
npm run dev      # or: npm run build && ORGANISER_PIN=<secret> npm start
```

Confirm `http://localhost:5173/api/health` returns `{"ok":true}`.

### 2. Open the projector

- Open the browser (Chrome/Edge recommended).
- Go to **`/screen?controls=1`** — this gives you the projector **plus** the
  hidden operator tray at the bottom.
- Drag that window to the projector / second monitor.
- Press **`F`** (or the Fullscreen button in the tray) to enter fullscreen.
- Confirm it shows **"WELCOME, FUTURE INNOVATORS."**

### 3. Open the console

- Open a **new tab** in the **same browser** (same profile!).
- Go to **`/admin`**.
- Keep this on the operator's screen (laptop display).
- Confirm the "Current Projector Stage" reads **01 · WELCOME**.

> Both tabs must be the same browser profile — that's how they sync. Incognito
> or a different browser will NOT sync.

### 4. Share the join URL with students

- **Laptop hosting:** the LAN IP, e.g. `http://192.168.1.50:5173/`
- **Cloud hosting:** your deployed URL, e.g. `https://your-app.onrender.com/`

Put it on a slide / QR code at the door.

---

## The show — scene by scene

Use **either** the `/admin` buttons **or** the keyboard / hidden tray on
`/screen`. They stay in sync. Recommended: drive from `/screen` with the
keyboard so you can watch the projector.

### ① Welcome  `→`  ② Find Your Team
- Students arrive and scan the QR code.
- The projector shows **MISSION 01 — Find Your Team / Character / Ally**.
- Students click **Join Game** on their phones, enter a name, see their team +
  character reveal, and get a 5-char **pair code**.
- Watch the **live stats rail** at the bottom of the projector — the "joined"
  count climbs as they join.

### ②  →  ③ Game In Progress
- Press `→` (or click **GAME IN PROGRESS** on `/admin`).
- Students walk around, find a teammate in the **same team**, swap codes, and
  enter the code to **lock a pair**.
- The stats rail shows **pairs locked** climbing, and the **recently matched**
  ticker scrolls recent pair-locks.
- Stay here as long as needed.

### ③  →  ④ Trigger Disturbance
- When most teams are paired, press `→`.
- A brief glitch + **"Something isn't right."** — theatrical interruption.

### ④  →  ⑤ Reveal Imposter Message
- Press `→`. Shows **HIGH ALERT / WARNING**.
- Press `→` three more times to advance the beats:
  1. YOUR TEAM HAS BEEN COMPROMISED.
  2. **THERE IS AN IMPOSTER IN EVERY TEAM.** ← the key line
  3. THEY HAVE BEEN PLAYING ALONGSIDE YOU.

### ⑤  →  ⑥ Show Childhood Photos
- Press `→`. The projector shows the **5×5 grid** of all 25 teams + childhood
  photos.
- Give the audience time. To focus on specific teams:
  - On `/admin`: click **Groups of 5** then page through, or **Single Large**
    and click a team id (`T01`–`T25`).
  - On `/screen`: use the tray buttons (Grid / Groups / ◀ Photo / Photo ▶).

### ⑥  →  ⑦ Start Hunt
- Press `→`. Shows **FIND THE IMPOSTER.**
- On `/admin`, set the hunt duration (default 5:00; quick buttons 3:00/5:00/10:00).
- Click **▶ START HUNT**. A giant countdown appears on the projector.
- The stats rail hides while the timer runs (so it doesn't compete).
- In the last 30s the timer turns red and pulses.
- At zero: **TIME'S UP**. It does **not** auto-advance — wait for the room.

### ⑦  →  ⑧ Final Countdown
- Press `→`. On `/admin`, click **▶ START FINAL COUNTDOWN**.
- Projector: **LOCK IN YOUR GUESS** → **5 · 4 · 3 · 2 · 1** → **DECISION LOCKED.**
- It stops there. Build the tension.

### ⑧  →  ⑨ Imposters Reveal Yourselves
- Press `→`. Shows **THE MOMENT OF TRUTH.**
- Press `→` twice:
  1. **IMPOSTERS…**
  2. **REVEAL YOURSELVES.** ← the 25 seniors physically step forward.

### ⑨  →  ⑩ Closing
- After the physical reveal settles, press `→`.
- **MISSION COMPLETE. WELCOME TO IEEE.**

---

## Keyboard cheat sheet (have this on the operator's desk)

| Key              | Action                                  |
| ---------------- | --------------------------------------- |
| `→` / `Space`    | Next scene / next beat                  |
| `←`             | Previous scene / previous beat          |
| `G`              | Photo grid (during photo-reveal)        |
| `F`              | Toggle fullscreen                       |
| `O`              | Toggle the hidden operator tray         |
| `Esc`            | Exit fullscreen                         |

> Keys don't fire while you're typing in an `/admin` input (e.g. hunt duration).

---

## If something goes wrong

| Situation | Recovery |
| --- | --- |
| Projector went to the wrong scene | Click the right scene card on `/admin`, or use the tray's `◀ Prev` / `Next ▶` |
| Pressed RESET by accident | RESET requires a confirmation click — you're safe unless you confirm |
| A student needs a new character | On their phone: **Reset my game** → enter the organiser PIN → they re-Join |
| Backend / Wi-Fi drops | Already-joined students keep playing (pairing is local). The stage show is unaffected. New joins resume when the server is back. Stats rail shows last-known values with a dimmed dot. |
| Projector refreshed | It re-reads `localStorage` and returns to the exact scene it was on |
| Need to start the whole show over | On `/admin`: **RESET STAGE** → confirm → back to Welcome. (Student reservations are NOT affected.) |

---

## After the event

- The SQLite database (`server/data.sqlite`) holds all reservations + names.
  Back it up if you want records; otherwise delete it for the next run.
- The stage state in `localStorage` can be RESET from `/admin`.

That's the whole show. Breathe, hit `→`, and let the projector do the work.
