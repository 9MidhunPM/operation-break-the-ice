import { StageShell } from "./StageShell";
import { MAX_WARNING_BEAT } from "../../lib/stage";

interface ImposterWarningSceneProps {
  /** 0..MAX_WARNING_BEAT — operator advances manually via NEXT. */
  beat: number;
}

const BEATS: { lead?: string; lines: { text: string; emph?: boolean }[] }[] = [
  {
    lines: [{ text: "Warning", emph: true }],
  },
  {
    lines: [
      { text: "Your Team" },
      { text: "Has Been", emph: true },
      { text: "Compromised." },
    ],
  },
  {
    lines: [
      { text: "There Is An" },
      { text: "Imposter", emph: true },
      { text: "In Every Team." },
    ],
  },
  {
    lines: [
      { text: "They Have Been" },
      { text: "Playing", emph: true },
      { text: "Alongside You." },
    ],
  },
];

export function ImposterWarningScene({ beat }: ImposterWarningSceneProps) {
  const safeBeat = Math.max(0, Math.min(beat, MAX_WARNING_BEAT));
  const current = BEATS[safeBeat];

  return (
    <StageShell tone="warn">
      <div className="stage-stack">
        <span className="warn-badge stage-enter">High Alert</span>
        <div className="stage-block" key={safeBeat}>
          {current.lead && (
            <p className="stage-eyebrow stage-enter">{current.lead}</p>
          )}
          {current.lines.map((l, i) => (
            <h1
              key={`${safeBeat}-${i}`}
              className={`warn-line stage-enter stage-enter-${Math.min(i + 2, 4)}`}
            >
              {l.emph ? <em>{l.text}</em> : <span>{l.text}</span>}
            </h1>
          ))}
        </div>
        <div className="warn-beat-dot" aria-hidden="true">
          {BEATS.map((_, i) => (
            <i key={i} className={i === safeBeat ? "on" : ""} />
          ))}
        </div>
        <p className="stage-fine">
          {safeBeat < MAX_WARNING_BEAT
            ? "Awaiting next transmission…"
            : "The hunt begins."}
        </p>
      </div>
    </StageShell>
  );
}
