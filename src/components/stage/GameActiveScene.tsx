import { StageShell } from "./StageShell";
import { StatsRail } from "./StatsRail";

export function GameActiveScene() {
  return (
    <StageShell tone="default">
      <div className="game-active-orbit" aria-hidden="true">
        <div className="game-active-ring" style={{ width: "78vmin", height: "78vmin" }} />
        <div className="game-active-ring r2" style={{ width: "56vmin", height: "56vmin" }} />
        <div className="game-active-ring r3" style={{ width: "34vmin", height: "34vmin" }} />
        <div className="game-active-pulse" />
      </div>
      <div className="stage-stack">
        <p className="stage-eyebrow stage-enter">Mission Active</p>
        <h1 className="stage-title stage-enter-2">Find Your People.</h1>
        <h2 className="stage-subtitle stage-enter-3">Build Your Alliance.</h2>
      </div>
      <StatsRail />
    </StageShell>
  );
}
