// Live event stats polling hook (shared by /screen and /admin).
//
// Reads read-only endpoints from the single-process backend (Agent 1's scope).
// The backend is NOT required for the stage show to run — if these endpoints
// are absent or unreachable, the hook reports `online: false` and the projector
// just hides the stats strip. Everything degrades gracefully.
//
// Planned backend contract (locked here so both agents agree):
//   GET /api/stats           -> StatsSnapshot
//   GET /api/recent-matches  -> RecentMatch[]
//
// These shapes are intentionally permissive: if the server returns fewer or
// differently-named fields, the UI still renders what it can.

import { useEffect, useRef, useState } from "react";

/** Aggregate counts for the projector / admin. */
export interface StatsSnapshot {
  /** Number of participants who have claimed a slot. */
  joined: number;
  /** Total slots the game supports (500 for 25 teams × 20). */
  total: number;
  /** Number of successfully locked pairs across the event (0 if backend doesn't track it yet). */
  pairsLocked: number;
  /** Joins in the last 60s (0 if backend doesn't track it yet). */
  joinedLastMinute: number;
  /** Per-team join counts keyed by team id, e.g. { T01: 12, T02: 9 }. */
  perTeam: Record<string, number>;
  /** Per-team capacity keyed by team id (for the fill bars). */
  perTeamCapacity: Record<string, number>;
}

export interface RecentMatch {
  /** Team id, e.g. "T01". */
  teamId: string;
  /** Display names of the two characters that paired. */
  a: string;
  b: string;
  /** Epoch ms when the pair locked. */
  at: number;
}

export interface StageStats {
  stats: StatsSnapshot | null;
  recent: RecentMatch[];
  /** True when the last fetch succeeded. */
  online: boolean;
}

const EMPTY_STATS: StatsSnapshot = {
  joined: 0,
  total: 0,
  pairsLocked: 0,
  joinedLastMinute: 0,
  perTeam: {},
  perTeamCapacity: {},
};

const DEFAULT_INTERVAL_MS = 2500;
const RECENT_LIMIT = 10;

/**
 * Poll the backend for live event stats. Returns offline-safe state.
 *
 * @param intervalMs  how often to poll (default 2.5s)
 * @param enabled     set false to skip polling (e.g. on dramatic scenes)
 */
export function useStageStats(
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS
): StageStats {
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [recent, setRecent] = useState<RecentMatch[]>([]);
  const [online, setOnline] = useState(false);
  const inflight = useRef(false);
  /** Remember the last successfully-fetched snapshot so transient failures
   *  don't blank the projector rail — it can show stale numbers + offline dot. */
  const prevStatsRef = useRef<StatsSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tick = async () => {
      if (inflight.current || cancelled) return;
      inflight.current = true;
      try {
        const [statsRes, recentRes] = await Promise.allSettled([
          fetch("/api/stats", { headers: { accept: "application/json" } }),
          fetch("/api/recent-matches?limit=" + RECENT_LIMIT, {
            headers: { accept: "application/json" },
          }),
        ]);

        if (cancelled) return;

        let nextStats: StatsSnapshot | null = null;
        let nextOnline = false;

        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const raw = await readJson(statsRes.value);
          nextStats = normalizeStats(raw);
          // Only count as online if we actually got a usable stats object.
          nextOnline =
            nextStats.total > 0 ||
            nextStats.joined > 0 ||
            Object.keys(nextStats.perTeam).length > 0;
        }
        if (recentRes.status === "fulfilled" && recentRes.value.ok) {
          const raw = await readJson(recentRes.value);
          const list = normalizeRecent(raw);
          if (!cancelled) setRecent(list);
        }

        if (!cancelled) {
          // On transient failure keep the last-known snapshot so the rail can
          // still show stale numbers with an offline dot instead of vanishing.
          const kept = nextStats ?? prevStatsRef.current;
          if (nextStats) prevStatsRef.current = nextStats;
          setStats(kept);
          setOnline(nextOnline);
        }
      } catch {
        // network error / server down — keep last known, mark offline
        if (!cancelled) setOnline(false);
      } finally {
        inflight.current = false;
      }
    };

    void tick();
    const id = window.setInterval(tick, intervalMs);

    // Re-poll immediately when the tab/window regains focus.
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, intervalMs]);

  return { stats, recent, online };
}

/* ------------------------------ normalizers ------------------------------- */
// The server may send extra/missing fields; coerce defensively so the UI never
// crashes on an unexpected shape.

/** Read a response body as JSON, but only if it actually looks like JSON. */
async function readJson(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return null; // e.g. Vite SPA fallback returns HTML
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeStats(raw: unknown): StatsSnapshot {
  if (!raw || typeof raw !== "object") return EMPTY_STATS;
  const r = raw as Record<string, unknown>;
  const perTeam: Record<string, number> = {};
  const perTeamCapacity: Record<string, number> = {};

  // Agent 1's backend sends perTeam as an ARRAY of { teamId, teamName, joined, capacity }.
  // My planned contract used a Record<string, number>. Handle BOTH so the UI
  // never breaks regardless of which shape the server ships.
  const pt = r.perTeam;
  if (Array.isArray(pt)) {
    for (const item of pt) {
      if (!item || typeof item !== "object") continue;
      const t = item as Record<string, unknown>;
      const id = String(t.teamId ?? t.id ?? "");
      const joined = typeof t.joined === "number" ? t.joined : Number(t.joined ?? 0);
      const cap = typeof t.capacity === "number" ? t.capacity : Number(t.capacity ?? 0);
      if (id) {
        perTeam[id] = Number.isFinite(joined) ? joined : 0;
        if (Number.isFinite(cap) && cap > 0) perTeamCapacity[id] = cap;
      }
    }
  } else if (pt && typeof pt === "object") {
    for (const [k, v] of Object.entries(pt as Record<string, unknown>)) {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) perTeam[k] = n;
    }
  }

  return {
    joined: toNonNegInt(r.joined),
    total: toNonNegInt(r.total),
    pairsLocked: toNonNegInt(r.pairsLocked ?? r.matches ?? r.lockedPairs),
    joinedLastMinute: toNonNegInt(r.joinedLastMinute ?? r.joinsLastMinute),
    perTeam,
    perTeamCapacity,
  };
}

function normalizeRecent(raw: unknown): RecentMatch[] {
  const out: RecentMatch[] = [];
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).matches)
    ? ((raw as Record<string, unknown>).matches as unknown[])
    : [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const teamId = String(m.teamId ?? m.team ?? "");
    const a = String(m.a ?? m.aName ?? m.characterA ?? m.left ?? "");
    const b = String(m.b ?? m.bName ?? m.characterB ?? m.right ?? "");
    const at = typeof m.at === "number" ? m.at : typeof m.t === "number" ? m.t : Date.now();
    if (teamId && a && b) out.push({ teamId, a, b, at });
    if (out.length >= RECENT_LIMIT) break;
  }
  return out;
}

function toNonNegInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Format a joined/total pair as a percent string, e.g. "37%". */
export function percent(joined: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((joined / total) * 100)}%`;
}

/** "a ⇄ b" display for a match row. */
export function matchLabel(m: RecentMatch): string {
  return `${m.a} ⇄ ${m.b}`;
}
