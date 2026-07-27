import { StageShell } from "./StageShell";
import { StatsRail } from "./StatsRail";

export function FindTeamScene() {
  return (
    <StageShell tone="default">
      <div className="stage-stack">
        <p className="stage-eyebrow stage-enter">Mission 01</p>
        <h1 className="stage-title stage-enter-2">Find Your Team.</h1>
        <h2 className="stage-subtitle stage-enter-3">Find Your Character.</h2>
        <h2 className="stage-subtitle stage-enter-3">Find Your Ally.</h2>
        <div className="stage-divider stage-enter-4" />
        <p className="stage-fine stage-enter-4">Scan the card you received to begin.</p>
      </div>
      <StatsRail />
    </StageShell>
  );
}
