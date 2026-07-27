import { useEffect, useState } from "react";
import { STAGE_META, requestFullscreen, exitFullscreen, isFullscreen } from "../../lib/stage";
import type { Stage, StageState, StageSet } from "../../lib/stage";
import {
  advance,
  retreat,
  nextPhoto,
  prevPhoto,
  enterStage,
} from "../../lib/stage";

interface StageControlsProps {
  state: StageState;
  setState: StageSet;
  /**
   * Whether to keep the tray open by default (e.g. ?controls=1). The tray can
   * always be toggled via the discreet corner dot or the "O" key.
   */
  openByDefault?: boolean;
}

/**
 * Hidden operator control tray for /screen. Lets the stage laptop advance the
 * projector locally without switching to /admin. Activated by:
 *   - the discreet dot in the bottom-right corner
 *   - the "O" key
 *   - ?controls=1 query parameter
 */
export function StageControls({ state, setState, openByDefault = false }: StageControlsProps) {
  const [open, setOpen] = useState(openByDefault);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "o" || e.key === "O") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goNext = () => setState((prev) => advance(prev));
  const goPrev = () => setState((prev) => retreat(prev));

  return (
    <>
      <button
        type="button"
        className="stage-operator-trigger"
        aria-label="Toggle operator controls"
        title="Operator controls (O)"
        onClick={() => setOpen((v) => !v)}
      />
      <div className={`stage-operator ${open ? "visible" : ""}`} role="toolbar" aria-label="Stage operator controls">
        <span className="op-stage">{STAGE_META[state.stage as Stage].tag}</span>
        <button type="button" onClick={goPrev} aria-label="Previous scene">
          ◀ Prev
        </button>
        <button type="button" onClick={goNext} aria-label="Next scene">
          Next ▶
        </button>
        {state.stage === "photo-reveal" && (
          <>
            <button type="button" onClick={() => setState({ photoMode: "grid" })} aria-label="Show grid">
              Grid
            </button>
            <button type="button" onClick={() => setState({ photoMode: "group", photoIndex: 0 })} aria-label="Show groups of five">
              Groups
            </button>
            <button type="button" onClick={() => setState((prev) => prevPhoto(prev))} aria-label="Previous photo">
              ◀ Photo
            </button>
            <button type="button" onClick={() => setState((prev) => nextPhoto(prev))} aria-label="Next photo">
              Photo ▶
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => (isFullscreen() ? exitFullscreen() : requestFullscreen(document.documentElement))}
          aria-label="Toggle fullscreen"
        >
          Fullscreen
        </button>
        <button
          type="button"
          onClick={() => setState((prev) => enterStage("welcome", prev))}
          aria-label="Jump to welcome"
          title="Jump to welcome (does not reset timer state)"
        >
          ⟲ Start
        </button>
        <span className="op-hint">O to hide · ←/→ scenes · G grid · F fullscreen</span>
      </div>
    </>
  );
}
