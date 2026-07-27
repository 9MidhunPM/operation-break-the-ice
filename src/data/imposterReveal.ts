// Static stage reveal assets: TEAM -> CHILDHOOD PHOTO.
// There is NO senior database here. We intentionally do NOT store senior names,
// current photos, contact info, isImposter flags, or any personal data.
//
// Team names below are FALLBACK display labels only. Real team names are read
// at runtime from Agent 1's src/data/teams.ts when present (see getTeamName in
// src/lib/stage.ts). If the real names are available they take precedence.

export interface ImposterReveal {
  teamId: string;
  /** Fallback team label; overridden by src/data/teams.ts when available. */
  teamName: string;
  /** Childhood photo URL served from /public. */
  childhoodImage: string;
}

function imageFor(n: number): string {
  const id = String(n).padStart(2, "0");
  return `/imposters/team-${id}.jpg`;
}

function fallbackName(n: number): string {
  const id = String(n).padStart(2, "0");
  return `Team ${id}`;
}

export const IMPOSTER_REVEALS: ImposterReveal[] = Array.from(
  { length: 25 },
  (_, i) => {
    const n = i + 1;
    return {
      teamId: `T${String(n).padStart(2, "0")}`,
      teamName: fallbackName(n),
      childhoodImage: imageFor(n),
    } satisfies ImposterReveal;
  }
);

export const TOTAL_TEAMS = IMPOSTER_REVEALS.length;
