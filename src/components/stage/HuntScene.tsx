import { StageShell } from "./StageShell";
import { StatsRail } from "./StatsRail";
import { formatClock, useNow, type StageState } from "../../lib/stage";

interface HuntSceneProps {
  huntDurationSeconds: number;
  huntStartedAt: number | null;
}

/**
 * "Find the imposter." Optionally shows a live countdown that the operator
 * started explicitly. At zero shows "TIME'S UP" and waits — never auto-advances.
 *
 * Shows the live-stats rail only while waiting (not while the timer is running
 * or has expired) so it never competes with the countdown.
 */
export function HuntScene({ huntDurationSeconds, huntStartedAt }: HuntSceneProps) {
  const running = huntStartedAt != null;
  const now = useNow(running);
  const elapsed = running ? (now - (huntStartedAt as number)) / 1000 : 0;
  const remaining = Math.max(0, huntDurationSeconds - elapsed);
  const finished = running && remaining <= 0;
  const urgent = running && !finished && remaining <= 30;
  const showStats = !running && !finished;

  return (
    <StageShell tone={finished ? "warn" : "default"}>
      <div className="hunt-ring" aria-hidden="true" />
      <div className="hunt-ring r2" aria-hidden="true" />
      <div className="stage-stack">
        <p className="stage-eyebrow stage-enter">The Hunt</p>
        {!finished ? (
          <>
            <h1 className="stage-title stage-enter-2">Find The Imposter.</h1>
            <h2 className="stage-subtitle stage-enter-3">
              One Of Them Is Standing With Your Team.
            </h2>
            <h2 className="stage-subtitle stage-enter-3">Look Closely. Trust Your Instincts.</h2>
            <div className="stage-divider stage-enter-4" />
            {running ? (
              <div
                className={`hunt-timer ${urgent ? "urgent" : ""}`}
                role="timer"
                aria-live="polite"
                aria-label={`Time remaining ${formatClock(remaining)}`}
              >
                {formatClock(remaining)}
              </div>
            ) : (
              <p className="stage-fine">Awaiting timer start…</p>
            )}
          </>
        ) : (
          <h1 className="stage-title stage-enter">Time&rsquo;s Up.</h1>
        )}
      </div>
      {showStats && <StatsRail />}
    </StageShell>
  );
}

export type { StageState };
