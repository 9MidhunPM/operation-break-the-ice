import { StageShell } from "./StageShell";
import { MAX_FINAL_BEAT } from "../../lib/stage";

interface FinalRevealSceneProps {
  /** 0 = "The Moment of Truth." ; 1 = "Imposters..." ; 2 = "Reveal Yourselves." */
  beat?: number;
}

export function FinalRevealScene({ beat = 0 }: FinalRevealSceneProps) {
  const safeBeat = Math.max(0, Math.min(beat, MAX_FINAL_BEAT));

  return (
    <StageShell tone="warn">
      <div className="reveal-silos" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="stage-stack">
        {safeBeat === 0 && (
          <>
            <p className="stage-eyebrow stage-enter">The Moment of Truth</p>
            <h1 className="reveal-title glow stage-enter-2">
              The Moment
              <br />
              of Truth.
            </h1>
            <p className="stage-fine">Imposters, stand by…</p>
          </>
        )}

        {safeBeat === 1 && (
          <>
            <p className="stage-eyebrow stage-enter">Reveal Sequence Initiated</p>
            <div className="reveal-ellipsis stage-enter-2" aria-hidden="true">
              Imposters…
            </div>
          </>
        )}

        {safeBeat === MAX_FINAL_BEAT && (
          <>
            <p className="stage-eyebrow stage-enter">Now</p>
            <h1 className="reveal-command">Imposters…</h1>
            <h1 className="reveal-command" style={{ marginTop: "0.1em" }}>
              Reveal Yourselves.
            </h1>
          </>
        )}

        <div className="warn-beat-dot" aria-hidden="true">
          {Array.from({ length: MAX_FINAL_BEAT + 1 }).map((_, i) => (
            <i key={i} className={i === safeBeat ? "on" : ""} />
          ))}
        </div>
      </div>
    </StageShell>
  );
}
