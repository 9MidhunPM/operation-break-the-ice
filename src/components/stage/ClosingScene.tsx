import { StageShell } from "./StageShell";

export function ClosingScene() {
  return (
    <StageShell tone="gold">
      <div className="stage-stack">
        <span className="closing-mark stage-enter">Mission Complete</span>
        <h1 className="stage-title stage-enter-2">Welcome to IEEE.</h1>
        <div className="stage-divider stage-enter-3" />
        <p className="stage-subtitle stage-enter-3">
          The People You Met Today
        </p>
        <p className="stage-subtitle stage-enter-4">
          Might Build Something Great With You Tomorrow.
        </p>
      </div>
    </StageShell>
  );
}
