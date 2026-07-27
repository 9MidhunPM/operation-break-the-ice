import { useEffect, useState } from "react";
import {
  STAGE_ORDER,
  STAGE_META,
  useStageState,
  advance,
  retreat,
  enterStage,
  nextPhoto,
  prevPhoto,
  startHunt,
  stopHunt,
  setHuntDuration,
  startCountdown,
  stopCountdown,
  resetState,
  hasRealTeamNames,
  formatClock,
  useNow,
  MAX_WARNING_BEAT,
  MAX_FINAL_BEAT,
  TOTAL_TEAMS,
  type Stage,
  type StageState,
  type StageSet,
} from "../lib/stage";
import { IMPOSTER_REVEALS } from "../data/imposterReveal";
import { useStageStats, matchLabel } from "../lib/useStageStats";
import { TeamFillGrid } from "../components/stage/TeamFillGrid";
import "../components/stage/stage.css";

/**
 * Stage control panel for the organiser. Large, rehearsal-friendly controls.
 * Drives the same localStorage stage state that /screen reads, so the two tabs
 * (on the SAME stage laptop/browser profile) stay in sync.
 */
export default function AdminPage() {
  const [state, setState] = useStageState();
  const [confirmReset, setConfirmReset] = useState(false);
  const screenUrl =
    typeof window !== "undefined" ? `${window.location.origin}/screen` : "/screen";

  // Keyboard nav on /admin too, but never while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setState((prev) => advance(prev));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setState((prev) => retreat(prev));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setState]);

  const jump = (s: Stage) => setState((prev) => enterStage(s, prev));

  return (
    <div className="admin-root">
      <div className="admin-wrap">
        {/* Header ---------------------------------------------------------- */}
        <div className="admin-head">
          <div>
            <h1 className="admin-title">Stage Control</h1>
            <p className="admin-subtitle">IEEE Orientation · Live Event Director</p>
          </div>
          <div className="admin-row">
            <a className="admin-btn primary" href="/screen" target="_screen" rel="noopener noreferrer">
              Open Projector ↗
            </a>
            <a className="admin-btn" href={`${screenUrl}?controls=1`} target="_screen_ctrl" rel="noopener noreferrer">
              Projector + Controls ↗
            </a>
            <button type="button" className="admin-btn danger" onClick={() => setConfirmReset(true)}>
              Reset Stage
            </button>
          </div>
        </div>

        {/* Current stage indicator ---------------------------------------- */}
        <div className="admin-current">
          <span className="dot" />
          <div>
            <div className="tag">Current Projector Stage</div>
            <div className="name">
              {STAGE_META[state.stage].tag} · {STAGE_META[state.stage].label}
            </div>
          </div>
        </div>

        {!hasRealTeamNames() && (
          <p className="admin-flags" style={{ marginTop: 12 }}>
            Note: src/data/teams.ts not found — using fallback team labels.
          </p>
        )}

        {/* Transport ------------------------------------------------------ */}
        <section className="admin-section">
          <h2>Transport</h2>
          <div className="admin-row">
            <button
              type="button"
              className="admin-btn"
              onClick={() => setState((prev) => retreat(prev))}
              aria-label="Previous scene"
            >
              ◀ Previous
            </button>
            <button
              type="button"
              className="admin-btn primary"
              onClick={() => setState((prev) => advance(prev))}
              aria-label="Next scene"
            >
              Next ▶
            </button>
            <span className="admin-kbd">
              <kbd>←</kbd> <kbd>→</kbd> navigate scenes
            </span>
          </div>
        </section>

        {/* Scene list ----------------------------------------------------- */}
        <section className="admin-section">
          <h2>Scenes — click any to jump (rehearsal)</h2>
          <div className="admin-grid">
            {STAGE_ORDER.map((s) => {
              const meta = STAGE_META[s];
              const isActive = state.stage === s;
              const isWarn =
                s === "disturbance" ||
                s === "imposter-warning" ||
                s === "countdown" ||
                s === "final-reveal";
              return (
                <button
                  key={s}
                  type="button"
                  className={`admin-card ${isActive ? "active" : ""} ${isWarn ? "warn" : ""}`}
                  onClick={() => jump(s)}
                  aria-pressed={isActive}
                >
                  <div className="ac-tag">{meta.tag}</div>
                  <div className="ac-action">{meta.action}</div>
                  <div className="ac-hint">{meta.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Beat control for multi-beat scenes ---------------------------- */}
        {(state.stage === "imposter-warning" || state.stage === "final-reveal") && (
          <section className="admin-section">
            <h2>
              {state.stage === "imposter-warning"
                ? `Warning Beat ${state.warningBeat}/${MAX_WARNING_BEAT}`
                : `Reveal Beat ${state.warningBeat}/${MAX_FINAL_BEAT}`}
            </h2>
            <div className="admin-row">
              <button
                type="button"
                className="admin-btn"
                onClick={() => setState((prev) => retreat(prev))}
                disabled={state.warningBeat === 0}
              >
                ◀ Previous Beat
              </button>
              <button
                type="button"
                className="admin-btn primary"
                onClick={() => setState((prev) => advance(prev))}
              >
                Next Beat ▶
              </button>
            </div>
          </section>
        )}

        {/* Photo controls ------------------------------------------------- */}
        {state.stage === "photo-reveal" && (
          <section className="admin-section">
            <h2>Childhood Photo Controls</h2>
            <div className="admin-panel">
              <div className="admin-row" style={{ marginBottom: 12 }}>
                <button type="button" className="admin-btn" onClick={() => setState({ photoMode: "grid", photoIndex: 0 })}>
                  Show Grid (5×5)
                </button>
                <button type="button" className="admin-btn" onClick={() => setState({ photoMode: "group", photoIndex: 0 })}>
                  Groups of 5
                </button>
                <button type="button" className="admin-btn" onClick={() => setState({ photoMode: "single", photoIndex: 0 })}>
                  Single Large
                </button>
              </div>
              <div className="admin-row">
                <button type="button" className="admin-btn" onClick={() => setState((prev) => prevPhoto(prev))}>
                  ◀ Prev Photo
                </button>
                <button type="button" className="admin-btn primary" onClick={() => setState((prev) => nextPhoto(prev))}>
                  Next Photo ▶
                </button>
                <span className="admin-status">
                  {state.photoMode === "grid"
                    ? "Grid mode"
                    : state.photoMode === "group"
                    ? `Group page ${state.photoIndex + 1}`
                    : `Photo ${state.photoIndex + 1} / ${TOTAL_TEAMS}`}
                </span>
              </div>
              <div style={{ marginTop: 14 }}>
                <PhotoJumpGrid state={state} setState={setState} />
              </div>
            </div>
          </section>
        )}

        {/* Live stats ----------------------------------------------------- */}
        <LiveStatsPanel />

        {/* Hunt controls -------------------------------------------------- */}
        <section className="admin-section">
          <h2>Hunt Timer</h2>
          <div className="admin-panel">
            <div className="admin-row" style={{ marginBottom: 12 }}>
              <div className="admin-field">
                <label htmlFor="hunt-dur">Duration (sec)</label>
                <input
                  id="hunt-dur"
                  type="number"
                  min={10}
                  max={3600}
                  step={15}
                  value={state.huntDurationSeconds}
                  onChange={(e) =>
                    setState((prev) =>
                      setHuntDuration(Number(e.target.value) || prev.huntDurationSeconds)
                    )
                  }
                />
              </div>
              <span className="admin-status">= {formatClock(state.huntDurationSeconds)}</span>
              <div className="admin-row">
                {[180, 300, 600].map((d) => (
                  <button key={d} type="button" className="admin-btn" onClick={() => setState(setHuntDuration(d))}>
                    {formatClock(d)}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-row">
              <button
                type="button"
                className="admin-btn primary"
                onClick={() => setState((prev) => startHunt(prev))}
                disabled={state.huntStartedAt != null}
              >
                ▶ Start Hunt
              </button>
              <button
                type="button"
                className="admin-btn danger"
                onClick={() => setState(stopHunt())}
                disabled={state.huntStartedAt == null}
              >
                ■ Stop Hunt
              </button>
              <button type="button" className="admin-btn" onClick={() => jump("hunt")}>
                Show Hunt Scene
              </button>
              <HuntReadout state={state} />
            </div>
          </div>
        </section>

        {/* Countdown controls -------------------------------------------- */}
        <section className="admin-section">
          <h2>Final Countdown</h2>
          <div className="admin-panel">
            <div className="admin-row">
              <button
                type="button"
                className="admin-btn primary"
                onClick={() => setState(startCountdown())}
                disabled={state.countdownStartedAt != null}
              >
                ▶ Start Final Countdown
              </button>
              <button
                type="button"
                className="admin-btn danger"
                onClick={() => setState(stopCountdown())}
                disabled={state.countdownStartedAt == null}
              >
                ■ Reset Countdown
              </button>
              <button type="button" className="admin-btn" onClick={() => jump("countdown")}>
                Show Countdown Scene
              </button>
            </div>
            <p className="admin-status" style={{ marginTop: 10 }}>
              Sequence: &ldquo;Lock in your guess&rdquo; → 5 · 4 · 3 · 2 · 1 → &ldquo;Decision
              Locked&rdquo;. Does not auto-advance to the reveal.
            </p>
          </div>
        </section>

        {/* Keyboard help -------------------------------------------------- */}
        <section className="admin-section">
          <h2>Keyboard Shortcuts (also on /screen)</h2>
          <div className="admin-panel">
            <div className="admin-row" style={{ gap: 18 }}>
              <span className="admin-kbd"><kbd>→</kbd>/<kbd>Space</kbd> next scene</span>
              <span className="admin-kbd"><kbd>←</kbd> previous scene</span>
              <span className="admin-kbd"><kbd>G</kbd> photo grid</span>
              <span className="admin-kbd"><kbd>F</kbd> fullscreen (/screen)</span>
              <span className="admin-kbd"><kbd>O</kbd> toggle operator tray (/screen)</span>
              <span className="admin-kbd"><kbd>Esc</kbd> exit fullscreen</span>
            </div>
          </div>
        </section>
      </div>

      {confirmReset && (
        <div className="admin-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Confirm reset">
          <div className="admin-dialog">
            <h3>Reset the stage?</h3>
            <p>
              This returns the projector to the Welcome scene and clears all timers
              (hunt + countdown). This affects every synced tab on this browser.
            </p>
            <div className="admin-row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="admin-btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn danger"
                onClick={() => {
                  setState(resetState());
                  setConfirmReset(false);
                }}
              >
                Reset Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- sub-components ----------------------------- */

function LiveStatsPanel() {
  const { stats, recent, online } = useStageStats();

  return (
    <section className="admin-section">
      <h2>Live Stats</h2>
      <div className="admin-panel">
        {!online ? (
          <p className="admin-stat-offline">
            Backend offline — live stats will appear here once the game server is running
            (endpoints <code>/api/stats</code> and <code>/api/recent-matches</code>).
          </p>
        ) : null}

        <div className="admin-stat-row">
          <div className="admin-stat-tile">
            <div className="num">{(stats?.joined ?? 0).toLocaleString()}</div>
            <div className="lbl">Players Joined</div>
          </div>
          <div className="admin-stat-tile">
            <div className="num">{stats?.total ? stats.total.toLocaleString() : "—"}</div>
            <div className="lbl">Total Slots</div>
          </div>
          <div className="admin-stat-tile">
            <div className="num">{(stats?.pairsLocked ?? 0).toLocaleString()}</div>
            <div className="lbl">Pairs Locked</div>
          </div>
          <div className="admin-stat-tile">
            <div className="num">+{stats?.joinedLastMinute ?? 0}</div>
            <div className="lbl">Joined / min</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div>
            <h3
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--stage-fg-dim)",
                margin: "0 0 8px",
              }}
            >
              Team Fill
            </h3>
            <TeamFillGrid stats={stats} />
          </div>

          <div>
            <h3
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--stage-fg-dim)",
                margin: "0 0 8px",
              }}
            >
              Recently Matched
            </h3>
            {recent.length === 0 ? (
              <p className="admin-empty">No matches yet.</p>
            ) : (
              <div className="admin-recent-feed">
                {recent.map((m, i) => (
                  <div className="admin-recent-row" key={`${m.at}-${i}`}>
                    <span className="team">{m.teamId}</span>
                    <span className="match">{matchLabel(m)}</span>
                    <span className="when">{relativeWhen(m.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function relativeWhen(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function HuntReadout({ state }: { state: StageState }) {
  const running = state.huntStartedAt != null;
  const now = useNow(running);
  if (!running) return <span className="admin-status">Timer stopped</span>;
  const elapsed = (now - (state.huntStartedAt as number)) / 1000;
  const remaining = Math.max(0, state.huntDurationSeconds - elapsed);
  const finished = remaining <= 0;
  return (
    <span className="admin-status" style={{ color: finished ? "var(--stage-warn-2)" : undefined }}>
      {finished ? "TIME'S UP" : `Remaining ${formatClock(remaining)}`}
    </span>
  );
}

function PhotoJumpGrid({ state, setState }: { state: StageState; setState: StageSet }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 6,
      }}
    >
      {IMPOSTER_REVEALS.map((r, i) => {
        const active = state.photoMode === "single" && state.photoIndex === i;
        return (
          <button
            key={r.teamId}
            type="button"
            className={`admin-btn ${active ? "primary" : ""}`}
            style={{ padding: "8px 6px", fontSize: "0.72rem", letterSpacing: "0.08em" }}
            onClick={() => setState({ photoMode: "single", photoIndex: i })}
            title={r.teamId}
          >
            {r.teamId}
          </button>
        );
      })}
    </div>
  );
}
