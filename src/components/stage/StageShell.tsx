import type { ReactNode } from "react";
import "./stage.css";

export type StageTone = "default" | "warn" | "gold";

interface StageShellProps {
  tone?: StageTone;
  children: ReactNode;
  /** When true, show subtle ambient particles. Default true. */
  particles?: boolean;
  /** When false, hide the faint scanline/grid overlays (for photo clarity). */
  ambient?: boolean;
}

/**
 * Full-viewport cinematic backdrop shared by every projected scene.
 * Renders layered gradient + grid + particles + vignette + scanlines, then the
 * scene content on top.
 */
export function StageShell({
  tone = "default",
  children,
  particles = true,
  ambient = true,
}: StageShellProps) {
  const toneClass = tone === "default" ? "" : `tone-${tone}`;
  return (
    <div className={`stage-root ${toneClass}`} aria-hidden={false}>
      <div className="stage-bg" />
      {ambient && <div className="stage-grid" />}
      {particles && (
        <div className="stage-particles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
      {ambient && <div className="stage-scanlines" aria-hidden="true" />}
      <div className="stage-vignette" aria-hidden="true" />
      <div className="stage-content">{children}</div>
    </div>
  );
}
