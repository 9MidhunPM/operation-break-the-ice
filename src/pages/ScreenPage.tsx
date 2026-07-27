import { useEffect, useRef } from "react";
import {
  useStageState,
  advance,
  retreat,
  requestFullscreen,
  MAX_FINAL_BEAT,
} from "../lib/stage";
import { WelcomeScene } from "../components/stage/WelcomeScene";
import { FindTeamScene } from "../components/stage/FindTeamScene";
import { GameActiveScene } from "../components/stage/GameActiveScene";
import { DisturbanceScene } from "../components/stage/DisturbanceScene";
import { ImposterWarningScene } from "../components/stage/ImposterWarningScene";
import { PhotoRevealScene } from "../components/stage/PhotoRevealScene";
import { HuntScene } from "../components/stage/HuntScene";
import { CountdownScene } from "../components/stage/CountdownScene";
import { FinalRevealScene } from "../components/stage/FinalRevealScene";
import { ClosingScene } from "../components/stage/ClosingScene";
import { StageControls } from "../components/stage/StageControls";
import "../components/stage/stage.css";

/**
 * Projector screen — intended for the auditorium projector. Fills the viewport,
 * hides page chrome, uses huge typography and cinematic transitions.
 *
 * The stage laptop advances scenes locally via the hidden operator tray
 * (corner dot, "O" key, or ?controls=1) or via /admin in another tab. The two
 * tabs stay in sync through localStorage on the SAME browser profile.
 */
export default function ScreenPage() {
  const [state, setState] = useStageState();
  const controlsFromQuery = useControlsFlag();

  // Keyboard control for the live stage laptop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) return;

      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
          e.preventDefault();
          setState((prev) => advance(prev));
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          setState((prev) => retreat(prev));
          break;
        case "g":
        case "G":
          if (state.stage === "photo-reveal") {
            setState({ photoMode: "grid", photoIndex: 0 });
          }
          break;
        case "f":
        case "F":
          e.preventDefault();
          requestFullscreen(document.documentElement);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setState, state.stage]);

  return (
    <>
      {renderScene(state)}
      <StageControls state={state} setState={setState} openByDefault={controlsFromQuery} />
    </>
  );
}

function renderScene(state: ReturnType<typeof useStageState>[0]) {
  switch (state.stage) {
    case "welcome":
      return <WelcomeScene />;
    case "find-team":
      return <FindTeamScene />;
    case "game-in-progress":
      return <GameActiveScene />;
    case "disturbance":
      return <DisturbanceScene />;
    case "imposter-warning":
      return <ImposterWarningScene beat={state.warningBeat} />;
    case "photo-reveal":
      return <PhotoRevealScene mode={state.photoMode} index={state.photoIndex} />;
    case "hunt":
      return (
        <HuntScene
          huntDurationSeconds={state.huntDurationSeconds}
          huntStartedAt={state.huntStartedAt}
        />
      );
    case "countdown":
      return <CountdownScene countdownStartedAt={state.countdownStartedAt} />;
    case "final-reveal":
      // The final reveal reuses warningBeat as a 3-beat progression (0..2).
      return (
        <FinalRevealScene beat={state.warningBeat <= MAX_FINAL_BEAT ? state.warningBeat : 0} />
      );
    case "closing":
      return <ClosingScene />;
    default:
      return <WelcomeScene />;
  }
}

function useControlsFlag(): boolean {
  const ref = useRef(false);
  if (typeof window !== "undefined") {
    try {
      ref.current = new URLSearchParams(window.location.search).has("controls");
    } catch {
      ref.current = false;
    }
  }
  return ref.current;
}
