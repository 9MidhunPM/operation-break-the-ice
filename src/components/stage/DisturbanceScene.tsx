import { StageShell } from "./StageShell";

/**
 * Short theatrical interruption: a brief, accessibility-safe flicker/glitch,
 * followed by an ellipsis and then "Something isn't right."
 * No rapid strobing (sub-3Hz), and disabled under prefers-reduced-motion.
 */
export function DisturbanceScene() {
  return (
    <StageShell tone="warn" particles={false}>
      <div className="disturb-noise" aria-hidden="true" />
      <div className="stage-stack">
        <div className="disturb-ellipsis disturb-glitch" aria-hidden="true">
          ...
        </div>
        <p className="disturb-line">Something isn&rsquo;t right.</p>
      </div>
    </StageShell>
  );
}
