import { IMPOSTER_REVEALS } from "../../data/imposterReveal";
import { getTeamName, TOTAL_TEAMS } from "../../lib/stage";
import type { StatsSnapshot } from "../../lib/useStageStats";

interface TeamFillGridProps {
  stats: StatsSnapshot | null;
  /** Fallback characters per team if the backend doesn't report capacity. */
  perTeam?: number;
}

/**
 * 25-team mini bar grid used on /admin to show how full each team is.
 * Reads the same shared stats snapshot as the projector. Uses per-team
 * capacity from the backend when available, else the fallback (default 20).
 */
export function TeamFillGrid({ stats, perTeam = 20 }: TeamFillGridProps) {
  const fallbackCap = perTeam > 0 ? perTeam : 20;
  const perTeamMap = stats?.perTeam ?? {};
  const capMap = stats?.perTeamCapacity ?? {};

  return (
    <div className="team-fill-grid" role="list" aria-label="Team fill">
      {IMPOSTER_REVEALS.slice(0, TOTAL_TEAMS).map((r) => {
        const count = perTeamMap[r.teamId] ?? 0;
        const cap = capMap[r.teamId] ?? fallbackCap;
        const pct = cap > 0 ? Math.min(100, Math.round((count / cap) * 100)) : 0;
        const full = cap > 0 && count >= cap;
        return (
          <div className="team-fill-row" key={r.teamId} role="listitem">
            <div className="team-fill-head">
              <span className="team-fill-id">{r.teamId}</span>
              <span className="team-fill-name">
                {getTeamName(r.teamId, r.teamName)}
              </span>
              <span className={`team-fill-count ${full ? "team-fill-full" : ""}`}>
                {count}/{cap || "—"}
              </span>
            </div>
            <div className="team-fill-bar" aria-hidden="true">
              <div
                className={`team-fill-bar-inner ${full ? "team-fill-bar-full" : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
