import { StageShell } from "./StageShell";
import { useNow } from "../../lib/stage";

interface CountdownSceneProps {
  /** Epoch ms when countdown started, or null (waiting for operator). */
  countdownStartedAt: number | null;
}

const LOCK_IN_MS = 1200; // "Lock in your guess." lead-in
const STEP_MS = 1000; // 5..1 each one second
const COUNT_FROM = 5;
// total = LOCK_IN_MS + COUNT_FROM * STEP_MS => 6.2s, then "Decision Locked."

type Phase = { kind: "lockin" | "count" | "locked"; number?: number };

function computePhase(elapsedMs: number): Phase {
  if (elapsedMs < LOCK_IN_MS) return { kind: "lockin" };
  const stepIndex = Math.floor((elapsedMs - LOCK_IN_MS) / STEP_MS);
  if (stepIndex < COUNT_FROM) {
    const n = COUNT_FROM - stepIndex;
    return { kind: "count", number: n };
  }
  return { kind: "locked" };
}

/**
 * Final countdown: "Lock in your guess." → 5,4,3,2,1 → "Decision Locked."
 * Stays at "Decision Locked." and waits for the operator. Does NOT auto-advance
 * to the final reveal unless the operator explicitly presses NEXT.
 */
export function CountdownScene({ countdownStartedAt }: CountdownSceneProps) {
  const running = countdownStartedAt != null;
  const now = useNow(running);
  const elapsed = running ? now - (countdownStartedAt as number) : 0;
  const phase = running ? computePhase(elapsed) : { kind: "lockin" as const };

  return (
    <StageShell tone={phase.kind === "locked" ? "warn" : "default"}>
      <div className="stage-stack">
        {phase.kind === "lockin" && (
          <>
            <p className="stage-eyebrow stage-enter">Final Countdown</p>
            <h1 className="count-lock">Lock In Your Guess.</h1>
            <p className="stage-fine">Decision incoming…</p>
          </>
        )}

        {phase.kind === "count" && (
          <>
            <p className="stage-eyebrow">Final Countdown</p>
            <div
              className="count-number"
              key={phase.number}
              role="timer"
              aria-live="assertive"
              aria-label={`${phase.number}`}
            >
              {phase.number}
            </div>
            <div className="count-tick" aria-hidden="true">
              {Array.from({ length: COUNT_FROM }).map((_, i) => (
                <i key={i} className={(COUNT_FROM - i) <= (phase.number as number) ? "on" : ""} />
              ))}
            </div>
          </>
        )}

        {phase.kind === "locked" && (
          <>
            <p className="stage-eyebrow stage-enter">Decision Locked</p>
            <h1 className="count-locked stage-enter-2">Decision Locked.</h1>
            <p className="stage-fine">Awaiting the moment of truth…</p>
          </>
        )}

        {!running && phase.kind === "lockin" && (
          <p className="stage-fine">Press START FINAL COUNTDOWN to begin.</p>
        )}
      </div>
    </StageShell>
  );
}
