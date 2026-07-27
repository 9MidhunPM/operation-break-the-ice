import { useStageStats, percent, matchLabel } from "../../lib/useStageStats";

/**
 * Discreet live-stats strip for the projector. Mounted only on ambient scenes
 * (welcome / find-team / game-active / hunt). It sits at the bottom of the
 * screen at low contrast so it never competes with the hero text.
 *
 * If the backend is offline or the endpoints don't exist yet, the strip fades
 * to an "offline" hint and the show continues unaffected.
 */
export function StatsRail({ compact = false }: { compact?: boolean }) {
  const { stats, recent, online } = useStageStats();

  // Never been online and no data yet → show the unobtrusive offline hint.
  if (!stats) {
    return (
      <div className="stats-rail stats-rail-offline" aria-hidden="true">
        <span className="stats-dot stats-dot-off" />
        <span className="stats-offline-label">Live stats offline</span>
      </div>
    );
  }

  // Have last-known data (even if currently offline) → show it with the
  // appropriate dot colour so the operator can see staleness at a glance.

  const joined = stats?.joined ?? 0;
  const total = stats?.total ?? 0;
  const pairs = stats?.pairsLocked ?? 0;
  const lastMin = stats?.joinedLastMinute ?? 0;

  return (
    <div
      className={`stats-rail ${compact ? "stats-rail-compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`${joined} of ${total} players joined. ${pairs} pairs locked.`}
    >
      <div className="stats-rail-left">
        <span className={`stats-dot ${online ? "stats-dot-on" : "stats-dot-off"}`} />
        <div className="stats-metric">
          <span className="stats-num">{joined.toLocaleString()}</span>
          <span className="stats-sub">
            / {total ? total.toLocaleString() : "—"} joined
          </span>
        </div>
        {total > 0 && (
          <div className="stats-progress" aria-hidden="true">
            <div
              className="stats-progress-fill"
              style={{ width: percent(joined, total) }}
            />
          </div>
        )}
      </div>

      <div className="stats-rail-mid">
        <span className="stats-num">{pairs.toLocaleString()}</span>
        <span className="stats-sub">pairs locked</span>
        {lastMin > 0 && (
          <span className="stats-pulse">+{lastMin}/min</span>
        )}
      </div>

      {recent.length > 0 && (
        <div className="stats-ticker" aria-label="Recently matched">
          <span className="stats-ticker-label">Recently matched</span>
          <div className="stats-ticker-feed">
            {recent.slice(0, 5).map((m, i) => (
              <div className="stats-ticker-row" key={`${m.at}-${i}`}>
                <span className="stats-ticker-team">{m.teamId}</span>
                <span className="stats-ticker-match">{matchLabel(m)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
