import { useState } from "react";
import { StageShell } from "./StageShell";
import { IMPOSTER_REVEALS } from "../../data/imposterReveal";
import {
  GROUP_SIZE,
  TOTAL_TEAMS,
  clampPhotoIndex,
  getTeamName,
  type PhotoMode,
} from "../../lib/stage";

interface PhotoRevealSceneProps {
  mode: PhotoMode;
  /** group: page index 0..4 ; single: team index 0..24 ; ignored by grid. */
  index: number;
}

export function PhotoRevealScene({ mode, index }: PhotoRevealSceneProps) {
  if (mode === "single") {
    return <SinglePhoto index={clampPhotoIndex("single", index)} />;
  }
  if (mode === "group") {
    return <GroupPhoto page={clampPhotoIndex("group", index)} />;
  }
  return <GridPhoto />;
}

/* --------------------------------- grid ---------------------------------- */

function GridPhoto() {
  return (
    <StageShell tone="default" ambient={false} particles={false}>
      <div className="photo-grid-head">
        <p className="stage-eyebrow stage-enter">The Reveal</p>
        <h1 className="stage-title stage-enter-2">
          {TOTAL_TEAMS} Teams. {TOTAL_TEAMS} Imposters.
        </h1>
      </div>
      <div className="photo-grid" role="list">
        {IMPOSTER_REVEALS.map((r, i) => (
          <PhotoTile
            key={r.teamId}
            teamId={r.teamId}
            name={getTeamName(r.teamId, r.teamName)}
            image={r.childhoodImage}
            delay={i}
            role="listitem"
          />
        ))}
      </div>
    </StageShell>
  );
}

/* --------------------------------- group --------------------------------- */

function GroupPhoto({ page }: { page: number }) {
  const start = page * GROUP_SIZE;
  const items = IMPOSTER_REVEALS.slice(start, start + GROUP_SIZE);
  const pages = Math.ceil(TOTAL_TEAMS / GROUP_SIZE);
  return (
    <StageShell tone="default" ambient={false} particles={false}>
      <div className="photo-group-head">
        <p className="stage-eyebrow stage-enter">Imposter Childhood Photos</p>
        <h1 className="stage-title stage-enter-2">
          Teams {start + 1}–{start + items.length}
        </h1>
      </div>
      <div className="photo-group" role="list">
        {items.map((r, i) => (
          <PhotoTile
            key={r.teamId}
            teamId={r.teamId}
            name={getTeamName(r.teamId, r.teamName)}
            image={r.childhoodImage}
            delay={i}
            role="listitem"
          />
        ))}
      </div>
      <div className="photo-pager" aria-hidden="true">
        {Array.from({ length: pages }).map((_, i) => (
          <i key={i} className={i === page ? "on" : ""} />
        ))}
      </div>
    </StageShell>
  );
}

/* -------------------------------- single --------------------------------- */

function SinglePhoto({ index }: { index: number }) {
  const r = IMPOSTER_REVEALS[index];
  return (
    <StageShell tone="default" ambient={false} particles>
      <div className="photo-single">
        <p className="stage-eyebrow stage-enter">Imposter Childhood Photo</p>
        <div className="photo-single-frame stage-enter-2">
          <PhotoImage image={r.childhoodImage} teamId={r.teamId} name={r.teamName} />
        </div>
        <div className="stage-enter-3">
          <p className="photo-single-id">{r.teamId}</p>
          <p className="photo-single-name">{getTeamName(r.teamId, r.teamName)}</p>
          <p className="photo-single-count">
            {index + 1} / {TOTAL_TEAMS}
          </p>
        </div>
      </div>
    </StageShell>
  );
}

/* -------------------------------- tile ----------------------------------- */

interface PhotoTileProps {
  teamId: string;
  name: string;
  image: string;
  delay?: number;
  role?: "listitem";
}

function PhotoTile({ teamId, name, image, delay = 0, role }: PhotoTileProps) {
  return (
    <div
      className={`photo-tile stage-enter stage-enter-${Math.min(delay + 1, 4)}`}
      role={role}
    >
      <PhotoImage image={image} teamId={teamId} name={name} />
      <div className="photo-shade" />
      <div className="photo-label">
        <div className="photo-team-id">{teamId}</div>
        <div className="photo-team-name">{name}</div>
      </div>
    </div>
  );
}

/**
 * Renders the childhood image, falling back to an honest "photo pending"
 * placeholder if the file is missing / not yet supplied (graceful handling —
 * we never pretend an unavailable image was loaded).
 */
function PhotoImage({
  image,
  teamId,
  name,
}: {
  image: string;
  teamId: string;
  name: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      {!failed && (
        <img
          src={image}
          alt={`Childhood photo for ${name} (${teamId})`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={loaded ? {} : { opacity: 0 }}
        />
      )}
      {(failed || !loaded) && (
        <div className="photo-placeholder" aria-hidden={failed ? undefined : "true"}>
          <div className="pp-id">{teamId}</div>
          <div className="pp-tag">{failed ? "Photo Pending" : "Loading…"}</div>
        </div>
      )}
    </>
  );
}
