import type { CodeCheckResult, Slot } from '@/types/game'
import { ArtImage } from '@/components/shared/ArtImage'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

export interface PairConfirmProps {
  open: boolean
  player: Slot
  match: Extract<CodeCheckResult, { status: 'match' }>
  onCancel: () => void
  onConfirm: () => void
}

/** "TEAMMATE FOUND — LOCK THIS PAIR?" modal showing both characters. */
export function PairConfirm({
  open,
  player,
  match,
  onCancel,
  onConfirm,
}: PairConfirmProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Lock this pair?"
      message="You can only lock once. Make sure you've found the right teammate."
      confirmLabel="Lock Pair"
      cancelLabel="Cancel"
      variant="success"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {/* ConfirmDialog currently renders its own message; this children block is
          kept for a richer preview if the dialog is extended later. */}
      <PairPreview player={player} match={match} />
    </ConfirmDialog>
  )
}

function PairPreview({
  player,
  match,
}: {
  player: Slot
  match: Extract<CodeCheckResult, { status: 'match' }>
}) {
  return (
    <div className="mt-4 flex items-center justify-center gap-4" aria-hidden="true">
      <Avatar name={player.characterName} image={player.characterImage} accent={player.teamColor} />
      <span className="font-display text-2xl text-white/60">+</span>
      <Avatar name={match.characterName} image={match.characterImage} accent={match.teamColor} />
    </div>
  )
}

function Avatar({ name, image, accent }: { name: string; image: string; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/15">
        <ArtImage src={image} alt={name} accent={accent} label={name} className="h-full w-full object-cover" />
      </div>
      <span className="text-xs text-white/70">{name}</span>
    </div>
  )
}
