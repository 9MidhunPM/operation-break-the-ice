# Experience Design

## Principle

The app should make participants look up from their phones and interact physically.

## Participant journey

### Join

Minimal screen: event title, name field, Join.

### Character reveal

A short animated welcome introduces the participant by name, then reveals their character and team.

Visual direction: PlayStation-style game landing screen — dominant character artwork, enlarged/blurred background treatment, dark readable gradient, bold character name, team identity and pairing code.

### Pairing

The phone shows:

- character;
- team;
- public code;
- QR representing a deep link to the participant;
- “Pair with teammate” action.

Physical instruction is explicit: find another person from the same team and ask whether they are already paired.

Sending a code creates a request. Target sees a large Accept/Decline request. Acceptance locks both.

### Locked

Show both names + characters, team, and a single instruction: move to the team's gathering area and wait.

### Twist

When admin triggers `IMPOSTER_ALERT`, current participant content visually glitches into an alert. Seniors see the same alert as juniors.

### Hunt

Timer + team-specific clue. Keep text large; the phone is only a clue card.

### Photo

A team-specific childhood photo is released as the final clue.

### Vote

Show joined team members as selectable cards using name + character. No free-text names.

## Projector

### Joining

Large QR, event name, junior count.

### Pairing

Keep a fresh “Alliance formed” card plus the most recent few alliances and aggregate counts. Never let an animation queue build indefinitely.

### Alert / hunt / reveal

Use cinematic full-screen typography and restrained glitch effects. Avoid flashing patterns that could create accessibility problems.

## Admin

Optimise for confidence under pressure:

- clear current phase;
- large action buttons;
- disabled invalid actions;
- confirmations for destructive transitions;
- live per-team table;
- explicit offline/error states.

Admin should not require keyboard shortcuts to operate successfully.
