// Stage state machine, persistence, sync, and navigation helpers.
// Option B: localStorage is used ONLY for stage operator state so that
// /admin and /screen tabs on the SAME stage laptop/browser profile stay in sync.
// This is NOT cross-device realtime and is NOT used for student identity.

import { useCallback, useEffect, useRef, useState } from "react";

export type Stage =
  | "welcome"
  | "find-team"
  | "game-in-progress"
  | "disturbance"
  | "imposter-warning"
  | "photo-reveal"
  | "hunt"
  | "countdown"
  | "final-reveal"
  | "closing";

export type PhotoMode = "grid" | "group" | "single";

export interface StageState {
  stage: Stage;
  /** Sub-beat inside the imposter-warning stage (0..MAX_WARNING_BEAT). */
  warningBeat: number;
  /** grid = all 25, group = 5 per page, single = one large. */
  photoMode: PhotoMode;
  /** group: page index 0..4 ; single: team index 0..24 ; ignored by grid. */
  photoIndex: number;
  /** Configurable hunt duration in seconds (default 300 = 5:00). */
  huntDurationSeconds: number;
  /** Epoch ms when hunt timer was started, or null. */
  huntStartedAt: number | null;
  /** Epoch ms when final countdown was started, or null. */
  countdownStartedAt: number | null;
}

export const STORAGE_KEY = "ieee-orientation-stage-v1";

export const MAX_WARNING_BEAT = 3;
export const MAX_FINAL_BEAT = 2;
export const GROUP_SIZE = 5;
export const TOTAL_TEAMS = 25;

export const STAGE_ORDER: Stage[] = [
  "welcome",
  "find-team",
  "game-in-progress",
  "disturbance",
  "imposter-warning",
  "photo-reveal",
  "hunt",
  "countdown",
  "final-reveal",
  "closing",
];

export interface StageMeta {
  label: string;
  /** Button copy used on /admin. */
  action: string;
  /** Short tag shown in the scene list / current-stage indicator. */
  tag: string;
  /** Optional short description for the admin scene list. */
  hint: string;
}

export const STAGE_META: Record<Stage, StageMeta> = {
  welcome: {
    label: "Welcome",
    action: "WELCOME",
    tag: "01 · WELCOME",
    hint: "IEEE orientation opening title.",
  },
  "find-team": {
    label: "Find Your Team",
    action: "FIND YOUR TEAM",
    tag: "02 · FIND YOUR TEAM",
    hint: "Mission 01 — team, character, ally.",
  },
  "game-in-progress": {
    label: "Game In Progress",
    action: "GAME IN PROGRESS",
    tag: "03 · GAME IN PROGRESS",
    hint: "Ambient visuals while juniors play.",
  },
  disturbance: {
    label: "Disturbance",
    action: "TRIGGER DISTURBANCE",
    tag: "04 · DISTURBANCE",
    hint: "Brief glitch / signal disruption.",
  },
  "imposter-warning": {
    label: "Imposter Announcement",
    action: "REVEAL IMPOSTER MESSAGE",
    tag: "05 · IMPOSTER WARNING",
    hint: "Cinematic multi-beat warning.",
  },
  "photo-reveal": {
    label: "Childhood Photos",
    action: "SHOW CHILDHOOD PHOTOS",
    tag: "06 · PHOTO REVEAL",
    hint: "25 team childhood photos.",
  },
  hunt: {
    label: "Hunt",
    action: "START HUNT",
    tag: "07 · HUNT",
    hint: "Find the imposter (timed).",
  },
  countdown: {
    label: "Final Countdown",
    action: "START FINAL COUNTDOWN",
    tag: "08 · FINAL COUNTDOWN",
    hint: "Lock in your guess 5 → 1.",
  },
  "final-reveal": {
    label: "Final Reveal",
    action: "IMPOSTERS REVEAL YOURSELVES",
    tag: "09 · FINAL REVEAL",
    hint: "Physical reveal climax.",
  },
  closing: {
    label: "Closing",
    action: "CLOSING SCREEN",
    tag: "10 · CLOSING",
    hint: "Mission complete. Welcome to IEEE.",
  },
};

export const DEFAULT_STATE: StageState = {
  stage: "welcome",
  warningBeat: 0,
  photoMode: "grid",
  photoIndex: 0,
  huntDurationSeconds: 300,
  huntStartedAt: null,
  countdownStartedAt: null,
};

function readState(): StageState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<StageState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(s: StageState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/**
 * Subscribe to shared stage state. Writes go to localStorage and also update
 * same-tab state immediately; the `storage` event syncs the other tab/window
 * on the same browser profile.
 */
export function useStageState(): readonly [StageState, StageSet] {
  const [state, set] = useState<StageState>(() => readState());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      try {
        set({ ...DEFAULT_STATE, ...JSON.parse(e.newValue) });
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setState = useCallback<StageSet>((updater) => {
    set((prev) => {
      const patch = typeof updater === "function" ? updater(prev) : updater;
      const next = { ...prev, ...patch };
      writeState(next);
      return next;
    });
  }, []);

  return [state, setState] as const;
}

export type StageSet = (
  updater: Partial<StageState> | ((prev: StageState) => Partial<StageState>)
) => void;

/* ----------------------------- pure navigation ---------------------------- */

export function advance(state: StageState): Partial<StageState> {
  if (state.stage === "imposter-warning" && state.warningBeat < MAX_WARNING_BEAT) {
    return { warningBeat: state.warningBeat + 1 };
  }
  // final-reveal reuses warningBeat as a 3-beat progression (0..MAX_FINAL_BEAT).
  if (state.stage === "final-reveal" && state.warningBeat < MAX_FINAL_BEAT) {
    return { warningBeat: state.warningBeat + 1 };
  }
  const i = STAGE_ORDER.indexOf(state.stage);
  const nextStage = STAGE_ORDER[Math.min(i + 1, STAGE_ORDER.length - 1)];
  return enterStage(nextStage, state);
}

export function retreat(state: StageState): Partial<StageState> {
  if (state.stage === "imposter-warning" && state.warningBeat > 0) {
    return { warningBeat: state.warningBeat - 1 };
  }
  if (state.stage === "final-reveal" && state.warningBeat > 0) {
    return { warningBeat: state.warningBeat - 1 };
  }
  const i = STAGE_ORDER.indexOf(state.stage);
  const prevStage = STAGE_ORDER[Math.max(i - 1, 0)];
  return enterStage(prevStage, state);
}

/** Per-stage entry defaults (resets transient sub-state where appropriate). */
export function enterStage(
  target: Stage,
  _state: StageState
): Partial<StageState> {
  void _state;
  const patch: Partial<StageState> = { stage: target };
  if (target === "imposter-warning") patch.warningBeat = 0;
  if (target === "final-reveal") patch.warningBeat = 0;
  if (target === "photo-reveal") {
    patch.photoMode = "grid";
    patch.photoIndex = 0;
  }
  if (target !== "hunt") {
    // Don't silently clear a running hunt when merely navigating, but a fresh
    // START HUNT press resets the timer explicitly via startHunt().
  }
  if (target === "countdown") patch.countdownStartedAt = null;
  return patch;
}

/* ------------------------------- photo nav --------------------------------- */

export function clampPhotoIndex(mode: PhotoMode, index: number): number {
  if (mode === "single") {
    return Math.max(0, Math.min(index, TOTAL_TEAMS - 1));
  }
  if (mode === "group") {
    const pages = Math.ceil(TOTAL_TEAMS / GROUP_SIZE);
    return Math.max(0, Math.min(index, pages - 1));
  }
  return 0;
}

export function nextPhoto(state: StageState): Partial<StageState> {
  if (state.photoMode === "grid") return { photoMode: "single", photoIndex: 0 };
  return { photoIndex: clampPhotoIndex(state.photoMode, state.photoIndex + 1) };
}

export function prevPhoto(state: StageState): Partial<StageState> {
  if (state.photoMode === "grid") return { photoMode: "single", photoIndex: TOTAL_TEAMS - 1 };
  return { photoIndex: clampPhotoIndex(state.photoMode, state.photoIndex - 1) };
}

/* ----------------------------- timed actions ------------------------------- */

export function startHunt(state: StageState, durationSeconds?: number): Partial<StageState> {
  return {
    stage: "hunt",
    huntDurationSeconds:
      durationSeconds != null ? durationSeconds : state.huntDurationSeconds,
    huntStartedAt: Date.now(),
  };
}

export function stopHunt(): Partial<StageState> {
  return { huntStartedAt: null };
}

export function setHuntDuration(seconds: number): Partial<StageState> {
  return { huntDurationSeconds: Math.max(10, Math.min(3600, Math.round(seconds))) };
}

export function startCountdown(): Partial<StageState> {
  return { stage: "countdown", countdownStartedAt: Date.now() };
}

export function stopCountdown(): Partial<StageState> {
  return { countdownStartedAt: null };
}

export function resetState(): StageState {
  return { ...DEFAULT_STATE };
}

/* -------------------------------- clocks ----------------------------------- */

/** A live "now" value that updates on an interval; used by timed scenes. */
export function useNow(active: boolean, intervalMs = 100): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let timer = 0;
    const tick = () => setNow(Date.now());
    timer = window.setInterval(tick, intervalMs);
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, [active, intervalMs]);
  return now;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/* ------------------------- team name adapter (defensive) ------------------- */
// Agent 1 owns src/data/teams.ts. We do NOT import it statically (the file may
// not exist yet during parallel development, and its export shape is unknown).
// import.meta.glob returns {} for non-matching patterns instead of failing the
// build, so we can read real team names when present and fall back otherwise.

interface Nameable {
  id?: unknown;
  teamId?: unknown;
  code?: unknown;
  name?: unknown;
  teamName?: unknown;
  label?: unknown;
}

const teamModules = import.meta.glob("../data/teams.{ts,tsx,js,jsx,mts,cts}", {
  eager: true,
}) as Record<string, Record<string, unknown>>;

function buildTeamNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const mod of Object.values(teamModules)) {
    if (!mod || typeof mod !== "object") continue;
    const candidates = [mod.teams, mod.TEAMS, mod.teamList, mod.default];
    for (const c of candidates) {
      if (!Array.isArray(c)) continue;
      for (const t of c) {
        const item = t as Nameable;
        const id = item.id ?? item.teamId ?? item.code;
        const name = item.name ?? item.teamName ?? item.label;
        if (typeof id === "string" && typeof name === "string" && name) {
          map.set(id, name);
        }
      }
      break;
    }
  }
  return map;
}

const TEAM_NAME_MAP = buildTeamNameMap();

export function getTeamName(teamId: string, fallback?: string): string {
  const real = TEAM_NAME_MAP.get(teamId);
  if (real) return real;
  return fallback ?? teamId;
}

export function hasRealTeamNames(): boolean {
  return TEAM_NAME_MAP.size > 0;
}

/* ----------------------------- fullscreen --------------------------------- */

export function requestFullscreen(el: Element | null): void {
  if (!el) return;
  const anyEl = el as Element & {
    webkitRequestFullscreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  };
  try {
    const p =
      el.requestFullscreen?.() ??
      anyEl.webkitRequestFullscreen?.() ??
      anyEl.msRequestFullscreen?.();
    if (p && typeof (p as Promise<void>).catch === "function") {
      (p as Promise<void>).catch(() => {
        /* user gesture / denied — ignore */
      });
    }
  } catch {
    /* ignore */
  }
}

export function exitFullscreen(): void {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  };
  try {
    const p =
      document.exitFullscreen?.() ??
      doc.webkitExitFullscreen?.() ??
      doc.msExitFullscreen?.();
    if (p && typeof (p as Promise<void>).catch === "function") {
      (p as Promise<void>).catch(() => {
        /* ignore */
      });
    }
  } catch {
    /* ignore */
  }
}

export function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}

export function useFullscreen(): readonly [boolean, () => void] {
  const [active, setActive] = useState(() => isFullscreen());
  const ref = useRef<() => void>(() => {});
  useEffect(() => {
    const onChange = () => setActive(isFullscreen());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);
  ref.current = () => {
    if (isFullscreen()) exitFullscreen();
    else requestFullscreen(document.documentElement);
  };
  return [active, () => ref.current()] as const;
}
