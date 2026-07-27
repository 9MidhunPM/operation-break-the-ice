import { StageShell } from "./StageShell";
import { StatsRail } from "./StatsRail";

export function WelcomeScene() {
  return (
    <StageShell tone="default">
      <div className="stage-stack">
        <span className="welcome-mark stage-enter">IEEE · ORIENTATION</span>
        <p className="stage-eyebrow stage-enter-2">Mission Control Online</p>
        <h1 className="stage-title stage-enter-3">Welcome, Future Innovators.</h1>
        <div className="stage-divider stage-enter-4" />
        <p className="stage-subtitle stage-enter-4">Your First Mission Starts Now.</p>
      </div>
      <StatsRail />
    </StageShell>
  );
}
